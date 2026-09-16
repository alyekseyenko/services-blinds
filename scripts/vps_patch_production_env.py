"""Patch server .env.local from local env vars, then rebuild app. Never commit secrets."""
import os
import sys
import time
import paramiko

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from deploy_helpers import migrate_legacy_containers

PATCH_KEYS = [
    "NEXT_PUBLIC_HQ_LABEL",
    "NEXT_PUBLIC_HQ_ADDRESS",
    "NEXT_PUBLIC_HQ_LAT",
    "NEXT_PUBLIC_HQ_LNG",
    "NEXT_PUBLIC_MAP_HQ_TITLE",
    "NEXT_PUBLIC_APP_NAME",
    "NEXT_PUBLIC_APP_SHORT_NAME",
    "NEXT_PUBLIC_COMPANY_LABEL",
    "NEXT_PUBLIC_COMPANY_WEBSITE",
]

hostname = os.environ.get("VPS_HOST")
password = os.environ.get("VPS_PASSWORD")
if not hostname or not password:
    raise SystemExit("Set VPS_HOST and VPS_PASSWORD")

lines = [f"{key}={os.environ[key]}" for key in PATCH_KEYS if os.environ.get(key)]
if not lines:
    raise SystemExit(f"Set at least one of: {', '.join(PATCH_KEYS)}")

REMOTE_DIR = os.environ.get("REMOTE_APP_DIR", "/root/app-tecnicos")
ENV_PATH = f"{REMOTE_DIR}/.env.local"
health_url = os.environ.get("DEPLOY_HEALTH_URL", "http://127.0.0.1:3005/api/health")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname, username=os.environ.get("VPS_USER", "root"), password=password, timeout=20)


def run(cmd: str, timeout: int = 1200) -> int:
    print(f"\n$ {cmd}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    code = stdout.channel.recv_exit_status()
    text = (stdout.read() + stderr.read()).decode("utf-8", errors="replace")
    if text.strip():
        print(text[-4000:])
    return code


grep_filters = " | ".join(f"grep -v '^{key}='" for key in PATCH_KEYS)
run(f"cd {REMOTE_DIR} && cat .env.local | {grep_filters} > .env.local.tmp && mv .env.local.tmp .env.local")

block = "\n# Production branding/HQ (patched via vps_patch_production_env.py)\n" + "\n".join(lines) + "\n"
sftp = client.open_sftp()
with sftp.file(ENV_PATH, "a") as remote_env:
    remote_env.write(block)
sftp.close()

print("Patched keys:", ", ".join(k.split("=")[0] for k in lines))
migrate_legacy_containers(run)
run(f"cd {REMOTE_DIR} && docker compose build app-tecnicos 2>&1 | tail -12")
run(f"cd {REMOTE_DIR} && docker compose up -d app-tecnicos redis")
time.sleep(12)
run(f"curl -sS {health_url}")
client.close()
