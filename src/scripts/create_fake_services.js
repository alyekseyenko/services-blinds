const TWENTY_MCP_URL = process.env.TWENTY_MCP_URL || 'http://localhost:3001';
const TWENTY_API_KEY = process.env.TWENTY_API_KEY;

if (!TWENTY_API_KEY) {
  console.error('Set TWENTY_API_KEY in the environment.');
  process.exit(1);
}

async function createOpp(name, type, personId, address, amount, notes, nsi) {
  const query = `mutation createOpp($data: OpportunityCreateInput!) {
    createOpportunity(data: $data) {
      id
      name
    }
  }`;

  const variables = {
    data: {
      name: name,
      stage: 'ENTRADA',
      pointOfContactId: personId,
      tipoDeServico: [type],
      nsi: nsi,
      notasImportantes: { markdown: notes },
      moradaDeServico: {
        addressStreet1: address.street,
        addressCity: address.city,
        addressPostcode: address.postcode,
        addressCountry: 'Portugal',
        addressState: address.state
      }
    }
  };

  const response = await fetch(`${TWENTY_MCP_URL}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TWENTY_API_KEY}`,
    },
    body: JSON.stringify({ query, variables })
  });

  const result = await response.json();
  if (result.errors) {
    console.error(`Error creating ${name}:`, JSON.stringify(result.errors, null, 2));
  } else {
    console.log(`Created: ${result.data.createOpportunity.name} (ID: ${result.data.createOpportunity.id})`);
  }
}

async function run() {
  const anaId = 'ae44c92e-4c98-43ee-98b9-565dfa573c3f';
  const gabrielId = 'e7969ec3-003b-4245-92af-7d8e8bf60615';

  const services = [
    {
      name: 'Instalação de Estores Elétricos',
      type: 'INSTALACAO',
      personId: anaId,
      address: { street: 'Rua Áurea 100', city: 'Lisboa', postcode: '1100-063', state: 'Lisboa' },
      amount: 1500,
      notes: 'Instalação de 4 estores motorizados na sala.',
      nsi: 93310
    },
    {
      name: 'Manutenção de Brisa Solar',
      type: 'MANUTENCAO',
      personId: gabrielId,
      address: { street: 'Rua de Santa Catarina 50', city: 'Porto', postcode: '4000-441', state: 'Porto' },
      amount: 250,
      notes: 'Limpeza e lubrificação das calhas de brisa solar.',
      nsi: 93311
    },
    {
      name: 'Reparação de Motor de Estore',
      type: 'REPARACAO',
      personId: anaId,
      address: { street: 'Avenida da Liberdade 10', city: 'Lisboa', postcode: '1250-141', state: 'Lisboa' },
      amount: 180,
      notes: 'Motor bloqueado no 2º andar. Necessário escadote.',
      nsi: 93312
    },
    {
      name: 'Medição para Orçamento',
      type: 'TIRAR_MEDIDAS',
      personId: gabrielId,
      address: { street: 'Rua do Almada 123', city: 'Porto', postcode: '4050-037', state: 'Porto' },
      amount: 0,
      notes: 'Tirar medidas para substituição de estores em toda a casa.',
      nsi: 93313
    }
  ];

  for (const s of services) {
    await createOpp(s.name, s.type, s.personId, s.address, s.amount, s.notes, s.nsi);
  }
}

run();
