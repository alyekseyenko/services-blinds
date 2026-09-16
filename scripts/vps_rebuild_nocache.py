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
health_url = os.environ.get("DEPLOY_HEALTH_URL", "http://127.0.0.1:3000/api/health")
container_app = os.environ.get("CONTAINER_APP", "technician-app")
run(f"curl -sS {health_url}")
run(f'docker inspect {container_app} --format "{{{{.Created}}}}"')
client.close()
