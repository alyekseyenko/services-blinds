const TWENTY_MCP_URL = process.env.TWENTY_MCP_URL || 'http://localhost:3001';
const TWENTY_API_KEY = process.env.TWENTY_API_KEY;

if (!TWENTY_API_KEY) {
  console.error('Set TWENTY_API_KEY in the environment.');
  process.exit(1);
}

async function listAllFields() {
  const response = await fetch(`${TWENTY_MCP_URL}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TWENTY_API_KEY}`,
    },
    body: JSON.stringify({
      query: `{
        opportunities(first: 1) {
          edges {
            node {
              id
              name
            }
          }
        }
      }`,
    }),
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

listAllFields().catch(console.error);
