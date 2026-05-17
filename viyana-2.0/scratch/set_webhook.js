const axios = require('axios');

async function setWebhook() {
  const instanceName = 'viyana-bot';
  const apiKey = '012F15E79DDC-42FA-B93E-5D1C5AD55E08';
  const baseUrl = 'https://evo.aethelsolutions.in';
  const webhookUrl = 'https://n8n.aethelsolutions.in/webhook/whatsapp-webhook';

  try {
    console.log(`Setting webhook for instance ${instanceName}...`);
    const response = await axios.post(`${baseUrl}/webhook/set/${instanceName}`, {
      url: webhookUrl,
      enabled: true,
      webhookByEvents: false,
      webhookBase64: false,
      events: [
        "MESSAGES_UPSERT"
      ]
    }, {
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('Webhook set successfully:', response.data);
  } catch (error) {
    console.error('Error setting webhook:', error.response?.data || error.message);
  }
}

setWebhook();
