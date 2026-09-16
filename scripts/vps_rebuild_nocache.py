import os
import sys
import time
import paramiko

hostname = sys.argv[1]
password = os.environ["VPS_PASSWORD"]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname, username="root", password=password, timeout=30)


def run(cmd: str, timeout: int = 1200) -> int:
    print(f"\n$ {cmd}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    code = stdout.channel.recv_exit_status()
    text = (stdout.read() + stderr.read()).decode("utf-8", errors="replace")
    safe = text.encode("ascii", errors="replace").decode("ascii")
    print(safe[-6000:] if len(safe) > 6000 else safe)
    return code

run("cd /root/app-tecnicos && docker compose build --no-cache app-tecnicos 2>&1 | tail -50")
run("cd /root/app-tecnicos && docker compose up -d app-tecnicos")
time.sleep(12)
run("curl -sS https://tecnicos.estoresrainha.com/api/health")
run('docker inspect habitarmos-app --format "{{.Created}}"')
client.close()
