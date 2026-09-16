import os
import sys
import time
import paramiko

hostname = sys.argv[1]
password = os.environ["VPS_PASSWORD"]
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
run("docker stop habitarmos-nginx 2>/dev/null; docker update --restart=no habitarmos-nginx 2>/dev/null || true")
time.sleep(10)
run('curl -sS http://localhost:3005/api/health')
run('curl -sS https://tecnicos.estoresrainha.com/api/health')
run('docker inspect habitarmos-app --format "{{.Created}}"')
run('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -8')
client.close()
