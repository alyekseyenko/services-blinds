const TWENTY_MCP_URL = 'http://localhost:3001';
const TWENTY_API_KEY = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImM0MDZmY2IzLTU2ZjYtNDRlOC1hYWRjLWMxOWE1NjIwZTIyZiJ9.eyJzdWIiOiIzY2UxYmFlZi1jMTk5LTQwYjgtOWFmNS0zZWYwZjk2NDFhNmMiLCJ0eXBlIjoiQVBJ_S0VZIiwid29ya3NwYWNlSWQiOiI3OTRjYzVjNC1jZWI1LTRkNDItOGE0Yy1mNTA2Y2U5MThkMmYifQ.yB7qB5_qS_m70yR39wY75y4zZ0q7R9W2y8S1m3y0x5k';

async function checkFields() {
  const response = await fetch(`${TWENTY_MCP_URL}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TWENTY_API_KEY}`,
    },
    body: JSON.stringify({
      query: `{
        __type(name: "Opportunity") {
          fields {
            name
            type {
              kind
              name
            }
          }
        }
      }`
    })
  });
  const data = await response.json();
  if (data.errors) {
    console.error('GraphQL Errors:', JSON.stringify(data.errors, null, 2));
    return;
  }
  if (!data.data || !data.data.__type) {
    console.error('Data or __type is undefined. Full response:', JSON.stringify(data, null, 2));
    return;
  }
  const fields = data.data.__type.fields.filter(f => 
    f.name.toLowerCase().includes('medid') || 
    f.name.toLowerCase().includes('nota') || 
    f.name.toLowerCase().includes('tecnic') ||
    f.name.toLowerCase().includes('relat')
  );
  console.log(JSON.stringify(fields, null, 2));
}

checkFields();
