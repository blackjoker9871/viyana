const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: "postgres://postgres.goeneonlbugvmhyzhbdn:Pcwz36QMcUgTn9gP@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT
          tc.table_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'Instance';
    `);
    const evoTables = [
      'Session', 'Chat', 'Contact', 'Message', 'MessageUpdate', 'Webhook', 
      'Chatwoot', 'Label', 'Proxy', 'Setting', 'Rabbitmq', 'Nats', 'Sqs', 'Kafka', 
      'Websocket', 'Typebot', 'TypebotSetting', 'Media', 'OpenaiCreds', 'OpenaiBot', 
      'IntegrationSession', 'OpenaiSetting', 'Template', 'Dify', 'DifySetting', 
      'EvolutionBot', 'EvolutionBotSetting', 'Flowise', 'FlowiseSetting', 'IsOnWhatsapp', 
      'N8n', 'N8nSetting', 'Evoai', 'EvoaiSetting'
    ];
    
    const nonEvoDeps = res.rows.filter(r => !evoTables.includes(r.table_name));
    console.log('Non-Evolution dependencies:', nonEvoDeps);
    console.log('Total dependencies:', res.rows.length);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
