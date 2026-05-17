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
    
    let sql = fs.readFileSync('scratch/evolution_init/init_utf8.sql', 'utf8');
    
    // Remove BOM if present
    if (sql.startsWith('\uFEFF')) {
      sql = sql.slice(1);
    }
    
    const commands = sql.split(';').map(cmd => cmd.trim()).filter(cmd => cmd.length > 0);
    console.log(`Found ${commands.length} commands to execute.`);
    
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      try {
        await client.query(cmd);
        // console.log(`[${i+1}/${commands.length}] Success`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          // console.log(`[${i+1}/${commands.length}] Skipped (Already exists)`);
        } else {
          console.error(`[${i+1}/${commands.length}] Error:`, err.message);
          console.error("Command was:", cmd.substring(0, 100) + "...");
        }
      }
    }
    
    console.log("Database initialization process completed!");
  } catch (err) {
    console.error("Fatal Error:", err);
  } finally {
    await client.end();
  }
}

run();
