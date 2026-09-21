# Análise de Falhas e Otimização para Produção (40 Técnicos ativos)
> [!WARNING]
> Esta análise identifica os gargalos estruturais e de desempenho que farão a aplicação falhar ou apresentar lentidão extrema ao escalar para **40 técnicos ativos** simultaneamente com o **Twenty CRM** e esta **App** alojados no mesmo VPS Hetzner na Alemanha.

---

## 1. Gargalo Crítico #1: Filtro In-Memory de Tarefas (Excesso de Tráfego de Dados)

### O Problema Atual (`src/lib/crm/tasks.ts`)
A função `fetchTechnicianTasks` solicita ao Twenty CRM **todas as tarefas existentes no sistema** de forma irrestrita:
```graphql
query getTasks {
  tasks(orderBy: { dueAt: AscNullsLast }) {
    edges { node { ... } }
  }
}
```
Após receber todas as tarefas, o servidor Next.js filtra-as na memória do servidor para o técnico específico:
```typescript
.filter(node => {
  const matchesId = node.assigneeId === technicianId;
  ...
})
```

### Por que vai falhar com 40 Técnicos?
* Se cada um dos 40 técnicos tiver uma média histórica de apenas 100 tarefas, o CRM terá **4000 tarefas**.
* Quando os 40 técnicos abrirem o painel ao início do dia (pico das 8h), o Next.js fará 40 requisições simultâneas de GraphQL. **Cada requisição irá descarregar as 4000 tarefas completas**, com sub-recursos (moradas, oportunidades, clientes).
* Isso gerará o processamento de **160.000 nós em poucos segundos**, saturando o CPU da VPS Hetzner e gerando centenas de megabytes de tráfego desnecessário de base de dados, culminando em `504 Gateway Timeout` ou crash da instância do Twenty CRM.

### A Solução Recomendada
Altere a query GraphQL para utilizar filtros do lado do servidor do Twenty CRM (`where`), descarregando **apenas as tarefas do próprio técnico**:
```graphql
query getTasks($assigneeId: UUID!) {
  tasks(
    where: { assigneeId: { eq: $assigneeId } }
    orderBy: { dueAt: AscNullsLast }
  ) {
    edges { node { ... } }
  }
}
```

---

## 2. Gargalo Crítico #2: Concorrência e Conexões PostgreSQL (Hetzner VPS)

### O Problema Atual
O Twenty CRM é alimentado por uma base de dados PostgreSQL. Por padrão, imagens Docker do PostgreSQL ou do Twenty CRM vêm configuradas com limites de conexões simultâneas baixas (geralmente `max_connections = 100`), sem pooling avançado.

### Por que vai falhar com 40 Técnicos?
* Quando 40 técnicos começarem a submeter relatórios de medições e atualizações em simultâneo (muitas vezes após períodos offline, onde dezenas de itens sincronizam juntos), cada ação dispara mutações GraphQL, gravações e triggers n8n.
* Uma única atualização de status pode abrir conexões para ler a tarefa, atualizar a tarefa, atualizar a oportunidade e invocar o n8n.
* O pool de conexões do PostgreSQL irá esgotar instantaneamente (`FATAL: remaining connection slots are reserved for non-replication superuser connections`), derrubando o Twenty CRM.

### A Solução Recomendada
1. **Configurar PgBouncer**: Instalar e configurar um pool de conexões (PgBouncer) à frente do PostgreSQL na VPS.
2. **Otimizar Postgres**: Configurar o PostgreSQL na VPS Hetzner de acordo com os recursos reais de hardware (por exemplo, usando ferramentas como `PGTune`).
3. **Limite de Rate/Jitter na Sincronização (`useSyncQueue.ts`)**: Adicionar um pequeno atraso aleatório (jitter de 50ms a 500ms) ao processar a fila local para evitar picos exatos de requisições concorrentes das apps.

---

## 3. Gargalo Crítico #3: Sobrecarga do n8n (Webhooks Bloqueantes)

### O Problema Atual
Os fluxos de alteração de tarefas e oportunidades disparam chamadas de webhook para o n8n para enviar notificações, gerar relatórios de medição em PDF e e-mails para os clientes.

### Por que vai falhar com 40 Técnicos?
* Se o n8n estiver configurado na mesma VPS com a configuração padrão usando SQLite (base de dados padrão do n8n), as execuções de webhook concorrentes bloquearão o ficheiro SQLite devido a travas de escrita simultâneas (`database is locked`).
* Processos pesados (como geração de PDFs ou chamadas de API externas) farão com que o n8n use 100% de CPU, atrasando a resposta do webhook e deixando as Server Actions do Next.js pendentes até estourarem o tempo limite.

### A Solução Recomendada
1. **n8n em PostgreSQL**: Migre a base de dados do n8n do SQLite para a mesma instância PostgreSQL (ou outra base dedicada) configurada no Hetzner.
2. **Modo Queue (Opcional)**: Se o volume for extremo, configure o n8n em modo escala utilizando Redis para gerir a fila de execuções.
3. **Webhooks Assíncronos**: Configure as Server Actions para disparar o webhook do n8n em modo assíncrono (fire-and-forget), não bloqueando a resposta do utilizador na app enquanto o PDF é gerado.

---

## 4. Gargalo Crítico #4: Latência e Latência de Rede (Alemanha vs. Portugal)

### O Problema Atual
Os servidores Hetzner Cloud mais comuns estão localizados na Alemanha (Falkenstein / Nuremberg). Se os técnicos estiverem em Portugal, cada requisição tem uma latência de rede física de ida e volta (RTT) de cerca de **40ms a 50ms**.

### Por que vai falhar com 40 Técnicos?
* Se uma Server Action fizer 3 chamadas sequenciais (await) ao CRM localizadas no servidor alemão, cada chamada adiciona latência interna, mas se o Next.js e o CRM estiverem ambos no Hetzner, a latência interna é <1ms. No entanto, a ligação inicial do utilizador à app acumula latência se a página inteira for renderizada no servidor a cada clique sem cache.
* O maior problema reside em operações síncronas que dependem de confirmações externas de rede multiplas.

### A Solução Recomendada
* **Docker Network Privada**: Certifique-se de que a app Next.js e o Twenty CRM estão a comunicar dentro da mesma rede Docker interna (ex: `bridge` partilhada ou rede customizada do docker-compose) usando nomes de serviço (ex: `http://twenty:3001`) em vez de dar a volta pelo IP público ou domínio externo. Isto reduz a latência de comunicação interna para **0ms**.
