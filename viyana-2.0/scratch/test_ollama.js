
async function test() {
  const url = "https://ollama-engine-ultra-fcw4dx7zja-uc.a.run.app/api/tags";
  console.log(`Testing connection to ${url}...`);
  try {
    const start = Date.now();
    const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(10000) });
    const end = Date.now();
    console.log(`Status: ${res.status}`);
    console.log(`Time: ${end - start}ms`);
    if (res.ok) {
      const data = await res.json();
      console.log('Tags:', JSON.stringify(data, null, 2));
    } else {
      const text = await res.text();
      console.log('Response:', text);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
