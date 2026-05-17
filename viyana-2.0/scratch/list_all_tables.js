const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: "postgres://postgres.goeneonlbugvmhyzhbdn:Pcwz36QMcUgTn9gP@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const targetTables = [
      'Instance', 'Session', 'Chat', 'Contact', 'Message', 'MessageUpdate', 'Webhook', 
      'Chatwoot', 'Label', 'Proxy', 'Setting', 'Rabbitmq', 'Nats', 'Sqs', 'Kafka', 
      'Websocket', 'Typebot', 'TypebotSetting', 'Media', 'OpenaiCreds', 'OpenaiBot', 
      'IntegrationSession', 'OpenaiSetting', 'Template', 'Dify', 'DifySetting', 
      'EvolutionBot', 'EvolutionBotSetting', 'Flowise', 'FlowiseSetting', 'IsOnWhatsapp', 
      'N8n', 'N8nSetting', 'Evoai', 'EvoaiSetting'
    ];
    const res = await client.query(`
      SELECT table_name, count(column_name) as col_count
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ANY($1)
      GROUP BY table_name
    `, [targetTables]);
    console.log("Table Name | Column Count");
    console.log("--------------------------");
    for (const row of res.rows) {
      console.log(`${row.table_name.padEnd(20)} | ${row.col_count}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
