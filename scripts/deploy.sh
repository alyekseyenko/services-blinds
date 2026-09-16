#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/app/app-tecnicos}"
cd "$APP_DIR"

echo "==> Deploy Habitarmos App Técnicos"
echo "    Diretório: $APP_DIR"

if [ ! -f ".env.local" ]; then
  echo "ERRO: .env.local não encontrado. Copie .env.example e configure as variáveis."
  exit 1
fi

echo "==> Pull / atualizar código"
if [ -d ".git" ]; then
  git pull --ff-only
else
  echo "Aviso: sem repositório git — a usar código local."
fi

echo "==> Build e restart dos contentores"
docker compose build app-tecnicos
docker compose up -d --remove-orphans

echo "==> Health check"
sleep 5
curl -fsS "http://localhost:3005/api/health" || curl -fsS "http://localhost/api/health"

echo ""
echo "Deploy concluído com sucesso."
