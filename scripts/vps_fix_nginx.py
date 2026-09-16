import os
import paramiko
import sys

hostname = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("VPS_HOST")
username = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("VPS_USER", "root")
password = sys.argv[3] if len(sys.argv) > 3 else os.environ.get("VPS_PASSWORD")

if not all([hostname, username, password]):
    raise SystemExit("Set VPS_HOST, VPS_USER, VPS_PASSWORD")

APP_NGINX = """server {
    listen 80;
    server_name app.estoresrainha.pt;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}

server {
    listen 80;
    server_name crm.estoresrainha.pt;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname, username=username, password=password, timeout=20)

def run(cmd: str, timeout: int = 120) -> tuple[str, str, int]:
    print(f"\n$ {cmd}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out.strip():
        print(out)
    if err.strip():
        print("STDERR:", err)
    return out, err, exit_code

# 1. Diagnóstico
run("docker logs habitarmos-nginx --tail 20 2>&1 || true")
run("ls -la /etc/nginx/sites-enabled/ 2>/dev/null || true")
run("nginx -t 2>&1 || true")

# 2. Parar nginx Docker em crash loop (porta 80 pertence ao host)
run("docker stop habitarmos-nginx 2>/dev/null || true")
run("docker update --restart=no habitarmos-nginx 2>/dev/null || true")

# 3. Configurar nginx do host
sftp = client.open_sftp()
with sftp.file("/etc/nginx/sites-available/habitarmos.conf", "w") as f:
    f.write(APP_NGINX)
sftp.close()

run("ln -sf /etc/nginx/sites-available/habitarmos.conf /etc/nginx/sites-enabled/habitarmos.conf")
run("rm -f /etc/nginx/sites-enabled/default")
run("nginx -t")
run("systemctl reload nginx")

# 4. Verificações
run('curl -sS -o /tmp/h.out -w "HTTP %{http_code}\\n" -H "Host: app.estoresrainha.pt" http://127.0.0.1/api/health; cat /tmp/h.out')
run('curl -sS -o /dev/null -w "HTTP %{http_code}\\n" -H "Host: crm.estoresrainha.pt" http://127.0.0.1/ || true')
run(f'curl -sS -o /dev/null -w "HTTP %{{http_code}}\\n" -H "Host: app.estoresrainha.pt" http://{hostname}/api/health')
run("cat /etc/nginx/sites-available/estoresrainha 2>/dev/null | head -40 || true")
run('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -10')

client.close()
print("\nDone.")
