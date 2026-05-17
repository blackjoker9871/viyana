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
    
    const sql = fs.readFileSync('scratch/evolution_init/init.sql', 'utf16le');
    console.log("Executing SQL...");
    
    // Split by semicolons and run (naive but usually works for prisma output)
    const commands = sql.split(';').filter(cmd => cmd.trim());
    for (let cmd of commands) {
      if (cmd.includes('CREATE') || cmd.includes('ALTER') || cmd.includes('INSERT')) {
        await client.query(cmd);
      }
    }
    
    console.log("Database initialized successfully!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
