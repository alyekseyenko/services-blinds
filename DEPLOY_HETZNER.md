# 🚀 Guia de Implementação e Deploy no VPS Hetzner (Alemanha)

Este guia explica como colocar a **App dos Técnicos** e o **Twenty CRM** a correr em produção num VPS da Hetzner com **HTTPS/SSL gratuito da Cloudflare**, **backups automáticos diários** e **máxima estabilidade de memória**.

---

## 1. Criar o Servidor na Hetzner Cloud

1. Aceda a [Hetzner Cloud Console](https://console.hetzner.cloud/).
2. Crie um novo servidor (**Add Server**):
   * **Localização:** Alemanha (Falkenstein ou Nuremberga)
   * **Imagem:** Ubuntu 24.04 LTS
   * **Tipo:** Standard (ex: **CPX21** com 3 vCPUs / 4GB RAM a ~7€/mês ou **CPX31** com 4 vCPUs / 8GB RAM a ~13€/mês)
   * **Chave SSH:** Adicione a sua chave SSH para acesso seguro.
3. Copie o **endereço IPv4** do servidor gerado (ex: `159.69.XX.XX`).

---

## 2. Configurar o Domínio na Cloudflare (SSL Grátis)

No painel da Cloudflare (plano gratuito):
1. Aceda ao separador **DNS** → **Records**.
2. Adicione 2 registos do tipo **A** a apontar para o IP do seu VPS Hetzner:
   * **Nome:** `app` → **IPv4:** `159.69.XX.XX` (com a nuvem Laranja / Proxy ligada)
   * **Nome:** `crm` → **IPv4:** `159.69.XX.XX` (com a nuvem Laranja / Proxy ligada)
3. No separador **SSL/TLS** da Cloudflare:
   * Selecione o modo **Full** (ou **Flexible**).

*Resultado:* Os seus endereços `https://technicians.yourcompany.com` e `https://crm.yourcompany.com` ficam imediatamente com **SSL/HTTPS ativo e gratuito**!

---

## 3. Preparar o Servidor (Docker, Swap & Código)

Conecte-se ao seu VPS via terminal SSH:
```bash
ssh root@SEU_IP_HETZNER
```

### 3.1. Ativar Swap de 4GB (Almofada de Segurança para a RAM)
*Isto garante que o PostgreSQL ou o Twenty CRM nunca vão abaixo por falta de memória:*
```bash
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 3.2. Instalar o Docker e Docker Compose
```bash
apt update && apt upgrade -y
apt install -y docker.io docker-compose-v2 git curl
systemctl enable --now docker
```

### 3.3. Clonar o Repositório
```bash
git clone <URL_DO_SEU_REPOSITORIO> /app/app-tecnicos
cd /app/app-tecnicos
```

---

## 4. Iniciar os Contentores em Produção

1. Configure as variáveis de ambiente no ficheiro `.env.local` do servidor:
```bash
cp .env.example .env.local
# Edite com nano/vim e insira a sua TWENTY_API_KEY gerada no Twenty CRM
```

2. Inicie a aplicação e o Nginx:
```bash
docker compose up -d --build
```

---

## 5. Ativar os Backups Diários Automáticos do Postgres

1. Dê permissão de execução ao script de backup:
```bash
chmod +x /app/app-tecnicos/scripts/backup-twenty-db.sh
```

2. Teste o backup manualmente uma vez:
```bash
/app/app-tecnicos/scripts/backup-twenty-db.sh
```
*(Verifique se o ficheiro `.sql.gz` foi criado na pasta `/var/backups/twenty-db`).*

3. Adicione o agendamento no Cron para correr **todas as noites às 03:00**:
```bash
(crontab -l 2>/dev/null; echo "0 3 * * * /app/app-tecnicos/scripts/backup-twenty-db.sh >> /var/log/twenty-backup.log 2>&1") | crontab -
```

---

## 6. (Opcional) Enviar Backups para o Google Drive com Rclone

Para ter uma cópia de segurança fora do servidor Hetzner a custo zero:
```bash
apt install -y rclone
rclone config
# Siga os passos para associar a sua conta Google Drive
```
Depois, basta descomentar a linha do `rclone copy` no ficheiro `scripts/backup-twenty-db.sh`!

---

## 7. Monitorização de Uptime 24/7 (100% Grátis)

A aplicação inclui um endpoint de diagnóstico rápido:
`https://technicians.yourcompany.com/api/health`

Pode registar uma conta gratuita no **[UptimeRobot.com](https://uptimerobot.com/)** ou **[BetterStack.com](https://betterstack.com/)** a monitorizar este endereço a cada 5 minutos. Se o servidor alguma vez falhar, recebe um alerta imediato por e-mail ou Telegram!

---

## 8. Checklist de Escala (40+ Técnicos)

Antes de escalar a operação, confirme estes pontos no VPS:

1. **PgBouncer** à frente do PostgreSQL do Twenty CRM (evita esgotamento de conexões).
2. **n8n em PostgreSQL** (não usar SQLite em produção).
3. **App + Twenty na mesma rede Docker interna** (comunicação `http://twenty:3001` em vez de IP público).
4. **Webhooks n8n fire-and-forget** — não bloquear a resposta ao técnico enquanto PDFs são gerados.
5. Monitorizar o **Circuit Breaker** no painel `/admin/observabilidade` quando o CRM estiver sob carga.
