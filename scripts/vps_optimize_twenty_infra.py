"""
Safe Twenty CRM infrastructure tuning on the VPS (no Twenty code changes).

- Backs up nginx site config before edits
- Enables SSE-friendly proxy settings for crm.estoresrainha.com
- Creates 4GB swap if missing (per DEPLOY_HETZNER.md)
- Runs lightweight PostgreSQL ANALYZE on Twenty DB
- Verifies nginx + CRM endpoints after reload
"""

from __future__ import annotations

import datetime as dt
import os
import sys

import paramiko

hostname = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("VPS_HOST")
password = os.environ.get("VPS_PASSWORD")
if not hostname or not password:
    raise SystemExit("Set VPS_HOST and VPS_PASSWORD")

NGINX_SITE = "/etc/nginx/sites-available/estoresrainha"
SSE_DIRECTIVES = """
        # Twenty CRM: SSE real-time updates (safe proxy tuning)
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname, username="root", password=password, timeout=30)


def run(cmd: str, timeout: int = 120) -> tuple[int, str]:
    print(f"\n$ {cmd}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    code = stdout.channel.recv_exit_status()
    text = (stdout.read() + stderr.read()).decode("utf-8", errors="replace")
    safe = text.encode("ascii", errors="replace").decode("ascii")
    print(safe[-6000:] if len(safe) > 6000 else safe)
    return code, safe


def ensure_swap() -> None:
    _, show = run("swapon --show || true")
    if "/swapfile" in show or "swap" in show.lower() and "file" in show.lower():
        print("[swap] Already configured.")
        return

    print("[swap] Creating 4G swapfile...")
    run("fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096")
    run("chmod 600 /swapfile")
    run("mkswap /swapfile")
    run("swapon /swapfile")
    _, fstab = run("grep -q '/swapfile' /etc/fstab && echo present || echo missing")
    if "missing" in fstab:
        run("echo '/swapfile none swap sw 0 0' >> /etc/fstab")
    run("sysctl vm.swappiness=10")
    run("grep -q 'vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf")


def patch_crm_nginx() -> None:
    sftp = client.open_sftp()
    with sftp.file(NGINX_SITE, "r") as f:
        content = f.read().decode("utf-8")

    if "proxy_buffering off" in content and "Twenty CRM: SSE" in content:
        print("[nginx] SSE tuning already present.")
        sftp.close()
        return

    stamp = dt.datetime.now(dt.UTC).strftime("%Y%m%d-%H%M%S")
    backup = f"{NGINX_SITE}.bak-{stamp}"
    with sftp.file(backup, "w") as f:
        f.write(content)
    print(f"[nginx] Backup written to {backup}")

    marker = "# Rota para o Twenty CRM"
    if marker not in content:
        sftp.close()
        raise SystemExit(f"Marker not found in {NGINX_SITE}")

    parts = content.split(marker, 1)
    head, tail = parts[0], marker + parts[1]

    # Patch only the CRM server block (first location / after CRM marker)
    crm_parts = tail.split("location / {", 1)
    if len(crm_parts) != 2:
        sftp.close()
        raise SystemExit("CRM location block not found")

    crm_head, crm_tail = crm_parts[0], crm_parts[1]
    if "proxy_buffering off" not in crm_head:
        crm_head = crm_head.replace(
            "location / {",
            "location / {" + SSE_DIRECTIVES,
            1,
        )

    new_content = head + crm_head + "location / {" + crm_tail
    with sftp.file(NGINX_SITE, "w") as f:
        f.write(new_content)
    sftp.close()
    print("[nginx] Patched CRM server block with SSE directives.")


def verify() -> None:
    code, _ = run("nginx -t")
    if code != 0:
        raise SystemExit("nginx -t failed — config not reloaded")

    run("systemctl reload nginx")
    run("curl -sS -o /dev/null -w 'crm home HTTP %{http_code} time %{time_total}s\\n' https://crm.estoresrainha.com/")
    run(
        "curl -sS -D - -o /dev/null --max-time 5 https://crm.estoresrainha.com/metadata "
        "-H 'Accept: text/event-stream' 2>&1 | head -12"
    )
    run("curl -sS -o /dev/null -w 'tecnicos health HTTP %{http_code} time %{time_total}s\\n' https://tecnicos.estoresrainha.com/api/health")
    run("free -h")
    run("swapon --show || true")
    run(
        "docker exec twenty-db-1 psql -U postgres -d default -c 'ANALYZE;' 2>&1 | tail -5"
    )


if __name__ == "__main__":
    ensure_swap()
    patch_crm_nginx()
    verify()
    client.close()
    print("\nDone. Twenty infra tuning applied safely.")
