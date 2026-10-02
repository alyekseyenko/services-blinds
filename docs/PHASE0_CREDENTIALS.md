# Fase 0 — Credenciais (antes do go-live)

Execute estes passos no VPS **antes** de partilhar acesso ou fazer deploy final.

1. **Mudar a password de root** (a password anterior foi exposta num chat).
2. **Configurar acesso SSH por chave** e testar `ssh root@<host>` com a chave.
3. Em `/etc/ssh/sshd_config`: `PermitRootLogin prohibit-password` (ou desativar root e usar um utilizador com sudo).
4. Reiniciar o SSH: `systemctl restart sshd`.
5. Se a mesma password era usada no Twenty, n8n ou e-mail, alterá-la também nesses serviços.
