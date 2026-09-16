const TWENTY_MCP_URL = process.env.TWENTY_MCP_URL || 'http://localhost:3001';
const TWENTY_API_KEY = process.env.TWENTY_API_KEY;

if (!TWENTY_API_KEY) {
  console.error('Set TWENTY_API_KEY in the environment.');
  process.exit(1);
}

async function checkFields() {
  const response = await fetch(`${TWENTY_MCP_URL}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TWENTY_API_KEY}`,
    },
    body: JSON.stringify({
      query: `{
        __type(name: "Opportunity") {
          fields { name }
        }
      }`,
    }),
  });
  const data = await response.json();
  const names = data?.data?.__type?.fields?.map((f) => f.name) ?? [];
  console.log(names.join('\n'));
}

checkFields().catch(console.error);
