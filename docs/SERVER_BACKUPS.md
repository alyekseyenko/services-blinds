# Backups no servidor (VPS)

Executar **apenas no servidor** (`/root/app-tecnicos`). Não commitar dumps.

## O que fazer backup

| Dado | Como |
|------|------|
| Medições (Postgres) | `docker exec technician-measurements-db pg_dump -U measurements measurements` |
| Dados da app (outbox, cache) | volume Docker `technician-app-data` → tar |
| Twenty CRM | já documentado em `DEPLOY_HETZNER.md` (`twenty-db`) |

## Cron diário (exemplo 03:15)

Criar `/root/backup-technician-app.sh`:

```bash
#!/bin/bash
set -euo pipefail
STAMP=$(date +%Y%m%d-%H%M)
DEST=/root/backups/technician-app
mkdir -p "$DEST"

docker exec technician-measurements-db pg_dump -U measurements measurements \
  | gzip -9 > "$DEST/measurements-$STAMP.sql.gz"

docker run --rm \
  -v technician-app-data:/data:ro \
  -v "$DEST":/backup \
  alpine tar -czf "/backup/app-data-$STAMP.tar.gz" -C /data .

find "$DEST" -type f -mtime +14 -delete

USED=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$USED" -ge 85 ]; then
  echo "ALERTA: disco da VPS acima de 85% ($USED%)" >&2
fi
```

```bash
chmod 700 /root/backup-technician-app.sh
(crontab -l 2>/dev/null; echo "15 3 * * * /root/backup-technician-app.sh >> /var/log/technician-backup.log 2>&1") | crontab -
```

Garantir `MEASUREMENTS_DB_PASSWORD` em `.env.local` antes de `docker compose up`.
