import os
import sys
import paramiko

hostname = sys.argv[1] if len(sys.argv) > 1 else "167.233.121.62"
password = os.environ["VPS_PASSWORD"]

node_script = r"""
const k = process.env.TWENTY_API_KEY;
const u = process.env.TWENTY_API_URL;

async function gql(query, variables = {}) {
  const res = await fetch(u + '/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + k },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

(async () => {
  const tasks = await gql(`query Recent {
    tasks(first: 20, orderBy: { updatedAt: DescNullsLast }) {
      edges { node { id title status } }
    }
  }`);
  const nodes = tasks.tasks.edges.map((e) => e.node);
  console.log('RECENT_STATUSES:', JSON.stringify(nodes.map((n) => ({ status: n.status, title: n.title })), null, 2));

  const testId = nodes.find((n) => String(n.status).toUpperCase().includes('AGEND'))?.id || nodes[0]?.id;
  if (!testId) return;
  console.log('TEST_TASK_ID:', testId);

  for (const candidate of ['EM CURSO', 'EM_CURSO', 'Em Curso', 'EMCURSO', 'AGENDADO', 'Agendado']) {
    try {
      const res = await gql(
        `mutation Up($id: UUID!, $data: TaskUpdateInput!) { updateTask(id: $id, data: $data) { id status } }`,
        { id: testId, data: { status: candidate } }
      );
      console.log('UPDATE_OK', candidate, JSON.stringify(res.updateTask));
      if (candidate !== 'AGENDADO' && candidate !== 'Agendado') {
        await gql(
          `mutation Revert($id: UUID!, $data: TaskUpdateInput!) { updateTask(id: $id, data: $data) { id status } }`,
          { id: testId, data: { status: 'AGENDADO' } }
        );
      }
    } catch (e) {
      console.log('UPDATE_FAIL', candidate, String(e.message || e));
    }
  }
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname, username="root", password=password, timeout=30)

sftp = client.open_sftp()
with sftp.file("/tmp/crm_status_probe.js", "w") as f:
    f.write(node_script)
sftp.close()

_, stdout, stderr = client.exec_command(
    "docker cp /tmp/crm_status_probe.js habitarmos-app:/tmp/crm_status_probe.js && "
    "docker exec habitarmos-app node /tmp/crm_status_probe.js",
    timeout=120,
)
print(stdout.read().decode("utf-8", errors="replace"))
err = stderr.read().decode("utf-8", errors="replace")
if err.strip():
    print("STDERR:", err)
client.close()
