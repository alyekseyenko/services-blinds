import os
import paramiko
import sys

hostname = sys.argv[1]
username = sys.argv[2] if len(sys.argv) > 2 else "root"
password = os.environ["VPS_PASSWORD"]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname, username=username, password=password, timeout=20)

health_url = os.environ.get("DEPLOY_HEALTH_URL", f"http://{hostname}/api/health")
crm_url = os.environ.get("CRM_HEALTH_URL", "")
cmds = [
    f'curl -sS -o /dev/null -w "app health HTTP %{{http_code}}\\n" {health_url}',
    f'curl -sS -o /tmp/prod.out -w "deploy health HTTP %{{http_code}}\\n" {health_url}; cat /tmp/prod.out',
]
if crm_url:
    cmds.append(f'curl -sS -o /dev/null -w "crm HTTP %{{http_code}}\\n" {crm_url} || true')
cmds.append('ls -la /etc/nginx/sites-enabled/')
for cmd in cmds:
    print("===", cmd[:80], "===")
    _, stdout, stderr = client.exec_command(cmd, timeout=30)
    print(stdout.read().decode())
    err = stderr.read().decode()
    if err.strip():
        print("STDERR:", err)
client.close()
