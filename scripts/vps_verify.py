import os
import paramiko
import sys

hostname = sys.argv[1]
username = sys.argv[2] if len(sys.argv) > 2 else "root"
password = os.environ["VPS_PASSWORD"]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname, username=username, password=password, timeout=20)

cmds = [
    f'curl -sS -o /dev/null -w "IP app health HTTP %{{http_code}}\\n" -H "Host: app.estoresrainha.pt" http://{hostname}/api/health',
    'curl -sS -o /tmp/prod.out -w "HTTPS tecnicos HTTP %{http_code}\\n" https://tecnicos.estoresrainha.com/api/health; cat /tmp/prod.out',
    'curl -sS -o /dev/null -w "HTTPS crm HTTP %{http_code}\\n" https://crm.estoresrainha.com/ || true',
    'ls -la /etc/nginx/sites-enabled/',
]
for cmd in cmds:
    print("===", cmd[:80], "===")
    _, stdout, stderr = client.exec_command(cmd, timeout=30)
    print(stdout.read().decode())
    err = stderr.read().decode()
    if err.strip():
        print("STDERR:", err)
client.close()
