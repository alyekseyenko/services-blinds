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
    "cat /etc/nginx/sites-available/estoresrainha",
    "curl -sS -D - -o /dev/null --max-time 5 https://crm.estoresrainha.com/metadata -H 'Accept: text/event-stream' 2>&1 | head -25",
    "curl -sS -o /dev/null -w 'twenty sse subscribe probe HTTP %{http_code} time %{time_total}s\\n' --max-time 5 -X POST https://crm.estoresrainha.com/graphql -H 'Content-Type: application/json' --data '{\"query\":\"{ __typename }\"}' 2>&1 || true",
    "docker logs twenty-server-1 --tail 30 2>&1 | grep -iE 'sse|event|stream|error' | tail -15 || echo 'no recent sse logs'",
]

for cmd in cmds:
    print("===", cmd[:100], "===")
    _, stdout, stderr = client.exec_command(cmd, timeout=60)
    out = (stdout.read() + stderr.read()).decode("utf-8", errors="replace")
    print(out.strip() or "(empty)")

client.close()
