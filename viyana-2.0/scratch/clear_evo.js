const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: "postgres://postgres.goeneonlbugvmhyzhbdn:Pcwz36QMcUgTn9gP@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to database");
    
    // We drop Instance with CASCADE to remove all Evolution API tables that depend on it
    console.log("Dropping Instance table with CASCADE...");
    await client.query('DROP TABLE IF EXISTS "Instance" CASCADE');
    
    // Drop other tables that might not depend on Instance but are part of Evolution
    const tablesToDrop = [
      'IsOnWhatsapp', 'Session' // Session might not have CASCADE if foreign key was missing
    ];
    for (const table of tablesToDrop) {
      await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }

    console.log("Evolution API tables cleared.");
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}

run();
