const TWENTY_MCP_URL = 'http://localhost:3001';
const TWENTY_API_KEY = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImM0MDZmY2IzLTU2ZjYtNDRlOC1hYWRjLWMxOWE1NjIwZTIyZiJ9.eyJzdWIiOiIzY2UxYmFlZi1jMTk5LTQwYjgtOWFmNS0zZWYwZjk2NDFhNmMiLCJ0eXBlIjoiQVBJ_S0VZIiwid29ya3NwYWNlSWQiOiI3OTRjYzVjNC1jZWI1LTRkNDItOGE0Yy1mNTA2Y2U5MThkMmYifQ.yB7qB5_qS_m70yR39wY75y4zZ0q7R9W2y8S1m3y0x5k';

async function listAllFields() {
  const response = await fetch(`${TWENTY_MCP_URL}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TWENTY_API_KEY}`,
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
      }`
    })
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

listAllFields();
