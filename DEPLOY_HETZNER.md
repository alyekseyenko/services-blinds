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

O projeto Docker tem `name: app-tecnicos` em `docker-compose.yml` para preservar o volume `technician-app-data` entre deploys.

### Deploy de atualizações (recomendado com git)

No servidor, use um clone git (não uma cópia manual de ficheiros):

```bash
cd /root/app-tecnicos
git pull origin master
docker compose --env-file .env.local up -d --build
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3005/api/health
```

### Deploy a partir do Windows (PowerShell)

Ficheiros locais **`.cursor-deploy.ps1`** e **`.cursor-deploy.local.env`** (ignorados pelo Git). Requer Python 3 com `pip install paramiko`.

Crie na raiz do repo `.cursor-deploy.local.env`:

```env
DEPLOY_SSH_HOST=SEU_IP_HETZNER
DEPLOY_SSH_USER=root
DEPLOY_SSH_PASSWORD=sua-password
```

Depois:

```powershell
cd C:\caminho\para\app-tecnicos
.\.cursor-deploy.ps1
```

Upload completo (tarball + rebuild): `python .cursor-deploy-ssh.py` — usa o mesmo `.cursor-deploy.local.env`.

Opcional: `$env:DEPLOY_SSH_USER = "root"` (default), `$env:DEPLOY_REMOTE_DIR = "/root/app-tecnicos"`.

One-liner (mesma sessão, depois de definir `DEPLOY_SSH_HOST` e `DEPLOY_SSH_PASSWORD`):

```powershell
$env:DEPLOY_SSH_HOST="SEU_IP"; $env:DEPLOY_SSH_PASSWORD="..."; .\.cursor-deploy.ps1
```

Migração a partir de cópia manual: clone para `/root/app-tecnicos-git`, copie apenas `.env.local`, confirme health, renomeie o diretório antigo para `/root/archive/app-tecnicos-YYYYMMDD` e renomeie o clone para `/root/app-tecnicos`. Mova `backups/`, `.docx` e fotos pessoais para `/root/archive` (chmod 700).

### Segurança SSH (obrigatório em produção)

- Troque a password de `root` após qualquer exposição.
- Instale chave SSH (`ssh-copy-id root@SEU_IP`).
- Em `/etc/ssh/sshd_config`: `PasswordAuthentication no` e `PermitRootLogin prohibit-password`.
- `systemctl reload sshd`

### Variáveis para n8n + app

No `.env.local` da app **e** no contentor n8n (mesmo valor):

- `N8N_WEBHOOK_SECRET` (mín. 16 caracteres) — usado pela app em `/api/public-links/evaluation` e nos webhooks de saída.
- `NEXT_PUBLIC_APP_URL` — URL pública da PWA (links de avaliação).

---

## 5. Ativar os Backups Diários Automáticos do Postgres

1. Crie a pasta de backups no servidor:
```bash
mkdir -p /var/backups/twenty-db
```

2. Teste um backup manual (ajuste o nome do contentor Postgres se necessário):
```bash
docker exec twenty-db-1 pg_dump -U postgres twenty > /var/backups/twenty-db/manual-test.sql
gzip /var/backups/twenty-db/manual-test.sql
```
*(Verifique se o ficheiro `.sql.gz` foi criado em `/var/backups/twenty-db`).*

3. Adicione o agendamento no Cron para correr **todas as noites às 03:00** (use o seu próprio script de backup no servidor):
```bash
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/backup-twenty-db.sh >> /var/log/twenty-backup.log 2>&1") | crontab -
```

---

## 6. (Opcional) Enviar Backups para o Google Drive com Rclone

Para ter uma cópia de segurança fora do servidor Hetzner a custo zero:
```bash
apt install -y rclone
rclone config
# Siga os passos para associar a sua conta Google Drive
```
Depois, adicione `rclone copy` ao seu script de backup no servidor.

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
