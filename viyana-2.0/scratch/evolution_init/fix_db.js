const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const client = new Client({
    connectionString: "postgres://postgres.goeneonlbugvmhyzhbdn:Pcwz36QMcUgTn9gP@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to database");
    
    // Use the UTF-8 version I created for reliability
    const sql = fs.readFileSync('scratch/evolution_init/init_utf8.sql', 'utf8');
    console.log("Executing SQL as a single block...");
    
    await client.query(sql);
    
    console.log("Database initialized successfully!");
  } catch (err) {
    console.error("Error during initialization:", err);
  } finally {
    await client.end();
  }
}

run();
