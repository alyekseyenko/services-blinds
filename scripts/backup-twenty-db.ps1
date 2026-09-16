# ==============================================================================
# SCRIPT DE BACKUP LOCAL - TWENTY CRM POSTGRESQL (POWERSHELL / WINDOWS)
# ==============================================================================

$BackupDir = ".\backups"
$ContainerName = "twenty-db-1"
$DbUser = "postgres"
$DbName = "default"
$Timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$BackupFile = "$BackupDir\twenty_backup_$Timestamp.sql"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " A iniciar Backup da Base de Dados do Twenty CRM..." -ForegroundColor Cyan
Write-Host " Container: $ContainerName | Base: $DbName"
Write-Host " Destino: $BackupFile"
Write-Host "========================================================" -ForegroundColor Cyan

docker exec $ContainerName pg_dump -U $DbUser -d $DbName > $BackupFile

if (Test-Path $BackupFile) {
    $Size = (Get-Item $BackupFile).Length / 1KB
    Write-Host " Backup concluído com sucesso! Tamanho: $([math]::Round($Size, 2)) KB" -ForegroundColor Green
} else {
    Write-Host " Erro ao criar ficheiro de backup." -ForegroundColor Red
}
