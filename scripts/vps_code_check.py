import os
import paramiko
import sys

hostname = sys.argv[1]
password = os.environ["VPS_PASSWORD"]
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname, username="root", password=password, timeout=20)
cmds = [
    "docker inspect habitarmos-app --format '{{.Created}}' 2>/dev/null || true",
    "docker exec habitarmos-app ls -la /app/src/lib/measurementsUtils.ts 2>/dev/null || echo 'measurementsUtils: NOT IN CONTAINER'",
    "docker exec habitarmos-app ls -la /app/.next/server 2>/dev/null | head -3 || true",
    "grep -E 'NEXTAUTH_URL|NEXT_PUBLIC_APP_URL|TWENTY_AUTH' /app/app-tecnicos/.env.local 2>/dev/null | sed 's/=.*$/=***/' || ls /root/app-tecnicos/.env.local 2>/dev/null || find / -name '.env.local' -path '*app-tecnicos*' 2>/dev/null | head -3",
]
for cmd in cmds:
    print("===", cmd[:70], "===")
    _, stdout, _ = client.exec_command(cmd, timeout=30)
    print(stdout.read().decode())
client.close()
