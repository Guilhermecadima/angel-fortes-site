require('dotenv').config();

const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendTestSMS() {
  try {
    const message = await client.messages.create({
      messagingServiceSid:
        process.env.TWILIO_MESSAGING_SERVICE_SID,

      to: '+351 911524973',

      body:
        'Angel Fortes: Teste do novo sistema de SMS.',
    });

    console.log('SMS enviado!');
    console.log('SID:', message.sid);
    console.log('Estado:', message.status);

  } catch (error) {
    console.error('ERRO TWILIO:');
    console.error(error.message);
    console.error('Código:', error.code);
  }
}

sendTestSMS();