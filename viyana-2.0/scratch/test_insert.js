const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: "postgres://postgres.goeneonlbugvmhyzhbdn:Pcwz36QMcUgTn9gP@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to database");
    
    // First need an Instance
    await client.query(`INSERT INTO "Instance" (id, name, "connectionStatus") VALUES ('test-id', 'test-instance', 'open') ON CONFLICT DO NOTHING`);
    
    console.log("Inserting into IntegrationSession...");
    await client.query(`
      INSERT INTO "IntegrationSession" 
      (id, "sessionId", "remoteJid", status, "instanceId", "updatedAt") 
      VALUES 
      ('sess-id', 'sess-name', 'jid@s.whatsapp.net', 'opened', 'test-id', NOW())
    `);
    console.log("Insert successful!");
    
    const res = await client.query('SELECT * FROM "IntegrationSession" WHERE id = \'sess-id\'');
    console.log("Row:", res.rows[0]);

    // Clean up
    await client.query('DELETE FROM "IntegrationSession" WHERE id = \'sess-id\'');
    await client.query('DELETE FROM "Instance" WHERE id = \'test-id\'');
    console.log("Cleanup successful!");

  } catch (err) {
    console.error("Error:", err.message);
    if (err.detail) console.error("Detail:", err.detail);
  } finally {
    await client.end();
  }
}

run();
