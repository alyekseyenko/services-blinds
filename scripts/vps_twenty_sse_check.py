import os
import paramiko
import sys

hostname = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("VPS_HOST")
password = os.environ.get("VPS_PASSWORD")
if not hostname or not password:
    raise SystemExit("Set VPS_HOST and VPS_PASSWORD")

CRM_PUBLIC_URL = os.environ.get("DEPLOY_CRM_URL", "https://crm.yourcompany.com")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname, username="root", password=password, timeout=20)

cmds = [
    "ls -la /etc/nginx/sites-enabled/",
    "grep -R \"crm\\.\" /etc/nginx/sites-available/ /etc/nginx/sites-enabled/ 2>/dev/null | head -20",
    "nginx -t 2>&1",
    "swapon --show || true",
    f"curl -sS -o /dev/null -w 'crm public HTTP %{{http_code}} time %{{time_total}}s\\n' {CRM_PUBLIC_URL}/ 2>&1 || true",
]

for cmd in cmds:
    print("===", cmd[:100], "===")
    _, stdout, stderr = client.exec_command(cmd, timeout=60)
    out = (stdout.read() + stderr.read()).decode("utf-8", errors="replace")
    print(out.strip() or "(empty)")

client.close()
