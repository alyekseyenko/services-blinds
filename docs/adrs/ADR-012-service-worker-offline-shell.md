# ADR-012: Service worker — static cache-first e shell offline do dashboard

## Contexto

Técnicos precisam de reabrir a PWA sem rede após uma visita. Após deploy, HTML antigo com JS novo causava erro de hidratação React (#418).

## Decisão

- `/_next/static/*`: **cache-first** com armazenamento em cache (ficheiros com hash no nome).
- Navegação (`document`): **network-first**; em falha de rede, servir shell em cache de `/dashboard` associado ao `buildId` de `/api/app-version`.
- Caches de shell versionados por build (`technician-app-cache-v9-shell-<buildId>`); metadado do build activo guardado no cache principal.
- Push notifications e handlers de push foram removidos do SW — agenda usa sininho in-app.

## Consequências

- Primeira visita online popula o shell; modo avião permite reabrir o dashboard (UI em cache).
- Após deploy, novo `buildId` invalida shells antigos no `install` do SW.
- `AppUpdatePrompt` continua a avisar quando o `buildId` da sessão difere do servidor.
