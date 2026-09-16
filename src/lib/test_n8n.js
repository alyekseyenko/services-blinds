async function testWebhook() {
  const url = 'http://localhost:5678/webhook-test/habitarmos-notifications';
  const data = {
    event: 'appointment_scheduled',
    title: 'Teste de Conexão',
    dueAt: new Date().toISOString(),
    pointOfContactEmail: 'teste@habitarmos.pt',
    cancelUrl: 'http://localhost:3000/cancelamento/teste',
    evaluationUrl: 'http://localhost:3000/avaliacao/teste'
  };

  console.log('Enviando teste para n8n...');
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    console.log('Resposta do n8n:', response.status, response.statusText);
  } catch (error) {
    console.error('Erro ao conectar ao n8n:', error.message);
    console.log('Certifica-te que o n8n está a correr e em modo "Listen for Test Event".');
  }
}

testWebhook();
