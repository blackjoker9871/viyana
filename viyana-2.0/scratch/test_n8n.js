const axios = require('axios');

async function test() {
  try {
    console.log('Sending test pulse to n8n...');
    const res = await axios.post('https://n8n-243501843401.us-central1.run.app/webhook-test/whatsapp-webhook', {
      body: {
        data: {
          key: { fromMe: false, remoteJid: 'test@s.whatsapp.net' },
          message: { conversation: 'Hello Viyana! This is a test.' },
          pushName: 'Tester'
        }
      }
    });
    console.log('n8n response:', res.status, res.data);
  } catch (e) {
    console.error('Failed to reach n8n:', e.message);
  }
}

test();
