/**
 * Remove todos os registos legados da tabela appauths no Twenty CRM.
 *
 * Uso:
 *   node scripts/purge-legacy-appauths.mjs
 *   docker exec technician-app node /app/scripts/purge-legacy-appauths.mjs
 */

const TWENTY_API_URL = process.env.TWENTY_API_URL || 'http://twenty-server-1:3000';
const TWENTY_API_KEY = process.env.TWENTY_API_KEY;

if (!TWENTY_API_KEY) {
  console.error('TWENTY_API_KEY não definida.');
  process.exit(1);
}

async function gql(query, variables = {}) {
  const response = await fetch(`${TWENTY_API_URL}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TWENTY_API_KEY}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    throw new Error(payload.errors?.[0]?.message || `HTTP ${response.status}`);
  }

  return payload.data;
}

async function main() {
  const list = await gql(`
    query ListAppAuths {
      appauths {
        edges {
          node {
            id
            email
            appRole
          }
        }
      }
    }
  `);

  const records = list.appauths?.edges?.map((edge) => edge.node) || [];
  console.log(`Encontrados ${records.length} registos appauths.`);

  if (records.length === 0) {
    console.log('Nada a remover.');
    return;
  }

  for (const record of records) {
    await gql(
      `mutation DeleteAppauth($id: UUID!) {
        deleteAppauth(id: $id) { id }
      }`,
      { id: record.id }
    );
    console.log(`Removido: ${record.email} (${record.appRole})`);
  }

  console.log('Limpeza concluída.');
}

main().catch((error) => {
  console.error('Falha na limpeza:', error.message);
  process.exit(1);
});
