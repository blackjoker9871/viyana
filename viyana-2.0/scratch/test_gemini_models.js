
const { google } = require('@ai-sdk/google');
const { generateText } = require('ai');

async function testGemini() {
  const GOOGLE_API_KEY = "AIzaSyA7Wc3zcozW1Zw0ngeVQ8DXH9pMU1clLkg";
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = GOOGLE_API_KEY;

  console.log("Testing Gemini 1.5 Flash...");
  try {
    const { text } = await generateText({
      model: google('gemini-1.5-flash'),
      prompt: "Say hello",
    });
    console.log("Success:", text);
  } catch (err) {
    console.error("Gemini 1.5 Flash Failed:", err.message);
    
    console.log("Trying Gemini 1.5 Flash Latest...");
    try {
      const { text } = await generateText({
        model: google('gemini-1.5-flash-latest'),
        prompt: "Say hello",
      });
      console.log("Success with Latest:", text);
    } catch (err2) {
      console.error("Gemini 1.5 Flash Latest Failed:", err2.message);
      
      console.log("Trying Gemini 1.0 Pro...");
      try {
        const { text } = await generateText({
          model: google('gemini-1.0-pro'),
          prompt: "Say hello",
        });
        console.log("Success with 1.0 Pro:", text);
      } catch (err3) {
        console.error("Gemini 1.0 Pro Failed:", err3.message);
        console.error("Full Error:", JSON.stringify(err3, null, 2));
      }
    }
  }
}

testGemini();
