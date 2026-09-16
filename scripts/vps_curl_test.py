import os
import paramiko
import sys

hostname = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("VPS_HOST")
username = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("VPS_USER", "root")
password = sys.argv[3] if len(sys.argv) > 3 else os.environ.get("VPS_PASSWORD")

if not all([hostname, username, password]):
    raise SystemExit("Usage: VPS_PASSWORD=... python vps_curl_test.py <host> <user>")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname, username=username, password=password, timeout=20)

commands = [
    "hostname && uptime",
    'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -20',
    'curl -sS -o /tmp/health3005.out -w "HTTP %{http_code} time %{time_total}s\\n" http://localhost:3005/api/health; echo ---; cat /tmp/health3005.out',
    'curl -sS -o /dev/null -w "HTTP %{http_code}\\n" http://localhost/api/health || true',
    'curl -sS -o /dev/null -w "HTTP %{http_code}\\n" http://127.0.0.1:3000/api/health || true',
    f'curl -sS -o /dev/null -w "HTTP %{{http_code}}\\n" {os.environ.get("DEPLOY_HEALTH_URL", "http://127.0.0.1:3000/api/health")} || true',
    'ss -tlnp | grep -E ":80|:3005|:3000" || true',
]

for cmd in commands:
    print("===", cmd[:90], "===")
    _, stdout, stderr = client.exec_command(cmd, timeout=60)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out.strip():
        print(out)
    if err.strip():
        print("STDERR:", err)

client.close()
