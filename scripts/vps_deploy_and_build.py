import os
import sys
import tarfile
import tempfile
import time
import paramiko

hostname = sys.argv[1]
password = os.environ["VPS_PASSWORD"]
local_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
remote_dir = "/root/app-tecnicos"

EXCLUDE_DIRS = {"node_modules", ".next", ".git", "terminals", ".cursor", "agent-transcripts", "coverage", ".turbo"}
EXCLUDE_FILES = {".env.local", ".env"}


def should_include(path: str, name: str) -> bool:
    rel = os.path.relpath(os.path.join(path, name), local_root).replace("\\", "/")
    if name in EXCLUDE_FILES:
        return False
    return not any(p in EXCLUDE_DIRS for p in rel.split("/"))


client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname, username="root", password=password, timeout=30)


def run(cmd: str, timeout: int = 1200) -> int:
    print(f"\n$ {cmd}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    code = stdout.channel.recv_exit_status()
    text = (stdout.read() + stderr.read()).decode("utf-8", errors="replace")
    safe = text.encode("ascii", errors="replace").decode("ascii")
    print(safe[-8000:] if len(safe) > 8000 else safe)
    return code

tar_path = os.path.join(tempfile.gettempdir(), f"deploy-{int(time.time())}.tar.gz")
with tarfile.open(tar_path, "w:gz") as tar:
    for root, dirs, files in os.walk(local_root):
        dirs[:] = [d for d in dirs if should_include(root, d)]
        for file in files:
            if should_include(root, file):
                full = os.path.join(root, file)
                tar.add(full, arcname=os.path.relpath(full, local_root).replace("\\", "/"))

remote_tar = "/tmp/app-deploy.tar.gz"
print(f"Uploading {tar_path}...")
sftp = client.open_sftp()
sftp.put(tar_path, remote_tar)
sftp.close()
os.remove(tar_path)

run(f"cd {remote_dir} && tar -xzf {remote_tar} && rm -f {remote_tar}")
code = run(f"cd {remote_dir} && docker compose build --no-cache app-tecnicos 2>&1 | tail -25")
if code != 0:
    print("WARN: build exit code", code)
run(f"cd {remote_dir} && docker compose up -d app-tecnicos")
time.sleep(12)
run("curl -sS https://tecnicos.estoresrainha.com/api/health")
run('docker inspect habitarmos-app --format "{{.Created}}"')
client.close()
