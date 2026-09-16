const TWENTY_MCP_URL = 'http://localhost:3001';
const TWENTY_API_KEY = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImM0MDZmY2IzLTU2ZjYtNDRlOC1hYWRjLWMxOWE1NjIwZTIyZiJ9.eyJzdWIiOiIzY2UxYmFlZi1jMTk5LTQwYjgtOWFmNS0zZWYwZjk2NDFhNmMiLCJ0eXBlIjoiQVBJX0tFWSIsIndvcmtzcGFjZUlkIjoiM2NlMWJhZWYtYzE5OS00MGI4LTlhZjUtM2VmMGY5NjQxYTZjIiwiaWF0IjoxNzgyNDgzMDQzLCJleHAiOjQ5MzYwODMwNDIsImp0aSI6ImU3ODA4YWU5LTcwNTItNDAxOS1iYjI2LTlhMmMzOTJmMDQ1ZCJ9.s_ensyu3uOpBOjIOEhDaqlJQQTh-d1vdwv2D4zWroJbb4MU8xVDJDn3RMynNqmo6oeuzow7vC9olY_5fHt7-ig";

async function listAllFields() {
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
          }
        }
      }`
    })
  });
  const data = await response.json();
  if (data.errors) {
    console.error('Errors:', JSON.stringify(data.errors, null, 2));
    return;
  }
  const fields = data.data.__type.fields;
  console.log(JSON.stringify(fields, null, 2));
}

listAllFields();
