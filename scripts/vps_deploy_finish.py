import os
import sys
import time
import paramiko

hostname = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("VPS_HOST")
password = os.environ.get("VPS_PASSWORD")
health_url = os.environ.get("DEPLOY_HEALTH_URL", "http://127.0.0.1:3000/api/health")
container_app = os.environ.get("CONTAINER_APP", "technician-app")
container_nginx = os.environ.get("CONTAINER_NGINX", "technician-nginx")
if not hostname or not password:
    raise SystemExit("Set VPS_HOST (or pass hostname arg) and VPS_PASSWORD")
remote_dir = "/root/app-tecnicos"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname, username="root", password=password, timeout=30)


def run(cmd: str, timeout: int = 900) -> int:
    print(f"\n$ {cmd}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    code = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    safe = (out + err).encode("ascii", errors="replace").decode("ascii")
    if safe.strip():
        print(safe[-4000:] if len(safe) > 4000 else safe)
    return code

code = run(f"cd {remote_dir} && docker compose build app-tecnicos 2>&1 | tail -30")
if code != 0:
    print("BUILD may have failed, exit:", code)

run(f"cd {remote_dir} && docker compose up -d app-tecnicos redis")
run(f"docker stop {container_nginx} 2>/dev/null; docker update --restart=no {container_nginx} 2>/dev/null || true")
time.sleep(10)
run('curl -sS http://localhost:3005/api/health')
run(f"curl -sS {health_url}")
run(f'docker inspect {container_app} --format "{{{{.Created}}}}"')
run('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -8')
client.close()
