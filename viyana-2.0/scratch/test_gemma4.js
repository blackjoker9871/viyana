
const { createOllama } = require('ollama-ai-provider');

async function testGemma4() {
  const OLLAMA_URL = "https://ollama-engine-ultra-fcw4dx7zja-uc.a.run.app";
  const modelId = "gemma4:26b";
  
  console.log(`Testing Gemma 4 on ${OLLAMA_URL}...`);
  
  try {
    const ollama = createOllama({ baseURL: `${OLLAMA_URL}/api` });
    const model = ollama(modelId);
    
    // Using a simpler fetch to test raw API first
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({
        model: modelId,
        prompt: "Why is the sky blue?",
        stream: false
      }),
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(60000) // 60s timeout
    });

    console.log(`HTTP Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log('Response received successfully!');
      console.log('Text:', data.response.substring(0, 100) + '...');
    } else {
      const text = await response.text();
      console.log('Error Response:', text);
    }
  } catch (err) {
    console.error('Error during test:', err.message);
  }
}

testGemma4();
