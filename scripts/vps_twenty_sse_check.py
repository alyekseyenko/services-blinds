import os
import paramiko
import sys

hostname = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("VPS_HOST")
password = os.environ.get("VPS_PASSWORD")
if not hostname or not password:
    raise SystemExit("Set VPS_HOST and VPS_PASSWORD")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname, username="root", password=password, timeout=20)

cmds = [
    "ls -la /etc/nginx/sites-enabled/",
    "grep -R \"estoresrainha\\|crm\\.\" /etc/nginx/sites-available/ /etc/nginx/sites-enabled/ 2>/dev/null | head -40",
    "nginx -t 2>&1",
    "swapon --show || true",
    "curl -sS -o /dev/null -w 'crm public health HTTP %{http_code} time %{time_total}s\\n' https://crm.estoresrainha.com/ 2>&1 || true",
    "curl -sS -D - -o /dev/null --max-time 8 -H 'Accept: text/event-stream' -H 'Host: crm.estoresrainha.com' http://127.0.0.1/metadata 2>&1 | head -20",
]

for cmd in cmds:
    print("===", cmd[:100], "===")
    _, stdout, stderr = client.exec_command(cmd, timeout=60)
    out = (stdout.read() + stderr.read()).decode("utf-8", errors="replace")
    print(out.strip() or "(empty)")

client.close()
