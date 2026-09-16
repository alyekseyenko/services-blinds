import os
import sys
import tarfile
import tempfile
import time
import paramiko

hostname = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("VPS_HOST")
username = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("VPS_USER", "root")
password = sys.argv[3] if len(sys.argv) > 3 else os.environ.get("VPS_PASSWORD")
local_root = sys.argv[4] if len(sys.argv) > 4 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

if not all([hostname, password]):
    raise SystemExit("Set VPS_PASSWORD and pass hostname")

EXCLUDE_DIRS = {
    "node_modules", ".next", ".git", "terminals", ".cursor",
    "agent-transcripts", "coverage", ".turbo",
}
EXCLUDE_FILES = {".env.local", ".env"}


def should_include(path: str, name: str) -> bool:
    rel = os.path.relpath(os.path.join(path, name), local_root)
    parts = rel.replace("\\", "/").split("/")
    if name in EXCLUDE_FILES:
        return False
    if any(p in EXCLUDE_DIRS for p in parts):
        return False
    return True


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 600) -> tuple[int, str, str]:
    print(f"\n$ {cmd}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    code = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out.strip():
        print(out)
    if err.strip():
        print("STDERR:", err)
    return code, out, err


print(f"Deploy source: {local_root}")
print(f"Target VPS: {hostname}")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname, username=username, password=password, timeout=30)

# Discover project path on VPS
_, out, _ = run(client, "docker inspect habitarmos-app --format '{{range .Mounts}}{{.Source}} {{end}}' 2>/dev/null || true")
remote_dir = None
for candidate in [
    "/app/app-tecnicos",
    "/root/app-tecnicos",
    "/opt/app-tecnicos",
]:
    _, check, _ = run(client, f"test -f {candidate}/docker-compose.yml && echo yes || echo no")
    if "yes" in check:
        remote_dir = candidate
        break

if not remote_dir:
    remote_dir = "/app/app-tecnicos"
    run(client, f"mkdir -p {remote_dir}")

print(f"Remote directory: {remote_dir}")

# Create tarball locally
tar_path = os.path.join(tempfile.gettempdir(), f"app-tecnicos-deploy-{int(time.time())}.tar.gz")
print(f"Creating archive: {tar_path}")
with tarfile.open(tar_path, "w:gz") as tar:
    for root, dirs, files in os.walk(local_root):
        dirs[:] = [d for d in dirs if should_include(root, d)]
        for file in files:
            if not should_include(root, file):
                continue
            full = os.path.join(root, file)
            arcname = os.path.relpath(full, local_root).replace("\\", "/")
            tar.add(full, arcname=arcname)

remote_tar = f"/tmp/app-tecnicos-deploy.tar.gz"
print(f"Uploading to {remote_tar}...")
sftp = client.open_sftp()
sftp.put(tar_path, remote_tar)
sftp.close()
os.remove(tar_path)

# Extract preserving .env.local on server
run(client, f"cd {remote_dir} && tar -xzf {remote_tar}")
run(client, f"rm -f {remote_tar}")

# Build and restart only app container (host nginx handles :80)
code, _, err = run(
    client,
    f"cd {remote_dir} && docker compose build app-tecnicos",
    timeout=900,
)
if code != 0:
    print("BUILD FAILED")
    client.close()
    sys.exit(1)

run(client, f"cd {remote_dir} && docker compose up -d app-tecnicos redis")
run(client, "docker stop habitarmos-nginx 2>/dev/null; docker update --restart=no habitarmos-nginx 2>/dev/null || true")

time.sleep(8)
run(client, 'curl -sS -o /tmp/h.out -w "local3005 HTTP %{http_code}\\n" http://localhost:3005/api/health; cat /tmp/h.out')
health_url = os.environ.get("DEPLOY_HEALTH_URL", "http://127.0.0.1:3000/api/health")
run(client, f'curl -sS -o /tmp/h2.out -w "prod health HTTP %{{http_code}}\\n" {health_url}; cat /tmp/h2.out')
run(client, 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -8')

client.close()
print("\nDeploy finished.")
