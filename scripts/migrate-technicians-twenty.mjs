/**
 * Migra técnicos legados (appauths) para a role "Técnicos" no Twenty CRM
 * e faz backfill de assigneeId nas tarefas antigas.
 *
 * Uso no VPS:
 *   docker exec habitarmos-app node /app/scripts/migrate-technicians-twenty.mjs
 */

const TWENTY_API_URL = process.env.TWENTY_API_URL || 'http://twenty-server-1:3000';
const TWENTY_API_KEY = process.env.TWENTY_API_KEY;
const METADATA_URL = process.env.TWENTY_METADATA_URL || `${TWENTY_API_URL}/metadata`;

if (!TWENTY_API_KEY) {
  console.error('TWENTY_API_KEY em falta');
  process.exit(1);
}

async function gql(url, query, variables = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TWENTY_API_KEY}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }
  return json.data;
}

async function main() {
  console.log('=== Migração Técnicos → Twenty CRM ===\n');

  const roles = await gql(
    METADATA_URL,
    `query { getRoles { id label workspaceMembers { id userEmail name { firstName lastName } } } }`
  );

  const technicianRole = roles.getRoles.find((r) =>
    /tecnic/i.test(r.label.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
  );

  if (!technicianRole) {
    throw new Error('Role "Técnicos" não encontrada no Twenty CRM');
  }

  console.log(`Role Técnicos: ${technicianRole.id} (${technicianRole.label})`);

  const appAuths = await gql(
    `${TWENTY_API_URL}/graphql`,
    `{ appauths(filter: { appRole: { eq: "technician" } }) { edges { node { id email name appRole ativo } } } }`
  );

  const legacyTechs = appAuths.appauths.edges
    .map((e) => e.node)
    .filter((n) => n.ativo && /tecnico[2-5]@/i.test(n.email));

  console.log(`Técnicos legados a migrar: ${legacyTechs.length}`);
  legacyTechs.forEach((t) => console.log(`  - ${t.email} (${t.name})`));

  const allMembers = await gql(
    `${TWENTY_API_URL}/graphql`,
    `{ workspaceMembers { edges { node { id userEmail name { firstName lastName } } } } }`
  );

  const memberByEmail = new Map(
    allMembers.workspaceMembers.edges.map((e) => [
      (e.node.userEmail || '').toLowerCase(),
      e.node,
    ])
  );

  for (const tech of legacyTechs) {
    const email = tech.email.toLowerCase();
    let member = memberByEmail.get(email);

    if (!member) {
      console.log(`\nConvite pendente para ${tech.email} (utilizador não existe no workspace)`);
      try {
        await gql(
          METADATA_URL,
          `mutation Invite($emails: [String!]!) { sendInvitations(emails: $emails) { success } }`,
          { emails: [tech.email] }
        );
        console.log(`  → Convite enviado para ${tech.email}`);
      } catch (err) {
        console.warn(`  → Não foi possível convidar ${tech.email}: ${err.message}`);
        console.warn('    Crie o utilizador manualmente no Twenty e atribua a role Técnicos.');
      }
      continue;
    }

    const alreadyInRole = technicianRole.workspaceMembers.some((m) => m.id === member.id);
    if (alreadyInRole) {
      console.log(`\n${tech.email} já está na role Técnicos (${member.id})`);
      continue;
    }

    await gql(
      METADATA_URL,
      `mutation AssignRole($workspaceMemberId: UUID!, $roleId: UUID!) {
        updateWorkspaceMemberRole(workspaceMemberId: $workspaceMemberId, roleId: $roleId) { id }
      }`,
      { workspaceMemberId: member.id, roleId: technicianRole.id }
    );
    console.log(`\n${tech.email} atribuído à role Técnicos (${member.id})`);
  }

  console.log('\n=== Backfill assigneeId em tarefas antigas ===');
  const tasksRes = await gql(
    `${TWENTY_API_URL}/graphql`,
    `{ tasks { edges { node { id title assigneeId technicianName } } } }`
  );

  const techMembers = technicianRole.workspaceMembers;
  let updated = 0;

  for (const edge of tasksRes.tasks.edges) {
    const task = edge.node;
    if (task.assigneeId) continue;

    const match = techMembers.find((m) => {
      const fullName = `${m.name?.firstName || ''} ${m.name?.lastName || ''}`.trim();
      return (
        task.technicianName &&
        fullName.toLowerCase() === task.technicianName.toLowerCase()
      );
    });

    if (!match) continue;

    await gql(
      `${TWENTY_API_URL}/graphql`,
      `mutation Backfill($id: UUID!, $data: TaskUpdateInput!) {
        updateTask(id: $id, data: $data) { id assigneeId }
      }`,
      {
        id: task.id,
        data: {
          assigneeId: match.id,
          technicianName: task.technicianName,
        },
      }
    );
    updated++;
    console.log(`  Tarefa ${task.id} → assignee ${match.userEmail}`);
  }

  console.log(`\nBackfill concluído: ${updated} tarefa(s) atualizada(s).`);
  console.log('\nNota: técnicos convidados devem aceitar o convite no email antes de conseguirem fazer login.');
}

main().catch((err) => {
  console.error('Erro na migração:', err.message);
  process.exit(1);
});
