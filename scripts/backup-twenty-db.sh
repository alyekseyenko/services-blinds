#!/bin/bash
# ==============================================================================
# SCRIPT DE BACKUP AUTOMÁTICO DIÁRIO - TWENTY CRM POSTGRESQL
# Adequado para VPS Hetzner / Linux com Docker
# ==============================================================================

set -e

# Configurações
BACKUP_DIR="${BACKUP_DIR:-/var/backups/twenty-db}"
CONTAINER_NAME="${DB_CONTAINER:-twenty-db-1}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-default}"
RETENTION_DAYS=7
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/twenty_backup_${TIMESTAMP}.sql.gz"

# 1. Garantir que a pasta de backup existe
mkdir -p "${BACKUP_DIR}"

echo "========================================================"
echo " [$(date)] A iniciar Backup da Base de Dados do Twenty CRM..."
echo " Container: ${CONTAINER_NAME} | Base de Dados: ${DB_NAME}"
echo " Destino: ${BACKUP_FILE}"
echo "========================================================"

# 2. Executar o pg_dump via Docker e comprimir em gzip
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    docker exec -t "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" | gzip > "${BACKUP_FILE}"
    echo " [$(date)] Backup concluído com sucesso! Tamanho: $(du -h "${BACKUP_FILE}" | cut -f1)"
else
    echo " [ERRO] O container '${CONTAINER_NAME}' não está em execução!"
    exit 1
fi

# 3. Eliminar backups com mais de 7 dias (Política de Retenção)
echo " [$(date)] A limpar backups antigos (> ${RETENTION_DAYS} dias)..."
find "${BACKUP_DIR}" -type f -name "twenty_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -exec rm -f {} \;
echo " [$(date)] Limpeza concluída."

# 4. (Opcional) Sincronização com Google Drive / Cloud com Rclone
# Descomente a linha abaixo caso instale o rclone no servidor:
# rclone copy "${BACKUP_FILE}" "gdrive:Backups-Twenty/" --quiet && echo " [$(date)] Enviado para o Google Drive com sucesso."

echo " [$(date)] Processo de backup terminado."
echo "========================================================"
