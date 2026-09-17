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
    "free -h",
    "nproc",
    "docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}' | grep -E 'twenty|technician|NAME'",
    "docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E 'twenty|technician'",
    "curl -sS -o /dev/null -w 'twenty metadata HTTP %{http_code} time %{time_total}s\\n' -X POST http://127.0.0.1:3000/metadata -H 'Content-Type: application/json' --data '{\"query\":\"{ currentWorkspace { id displayName } }\"}' 2>&1 || true",
    "curl -sS -o /dev/null -w 'twenty graphql HTTP %{http_code} time %{time_total}s\\n' -X POST http://127.0.0.1:3000/graphql -H 'Content-Type: application/json' --data '{\"query\":\"{ __typename }\"}' 2>&1 || true",
    "docker exec twenty-db-1 psql -U postgres -d default -tAc \"SELECT pg_size_pretty(pg_database_size('default'));\" 2>/dev/null || echo 'db size: unknown'",
    "docker exec twenty-db-1 psql -U postgres -d default -tAc \"SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 8;\" 2>/dev/null || echo 'table stats: unknown'",
]

for cmd in cmds:
    print("===", cmd[:90], "===")
    _, stdout, stderr = client.exec_command(cmd, timeout=60)
    out = (stdout.read() + stderr.read()).decode("utf-8", errors="replace")
    print(out.strip() or "(empty)")

client.close()
