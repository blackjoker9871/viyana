const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: "postgres://postgres.goeneonlbugvmhyzhbdn:Pcwz36QMcUgTn9gP@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to database");
    
    const res = await client.query('SELECT * FROM "Webhook"');
    console.log('Webhooks:', res.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
