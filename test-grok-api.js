// Quick test script to verify Grok API connection
// Run with: node test-grok-api.js

require('dotenv').config({ path: '.env.local' });

const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_API_URL = process.env.GROK_API_URL || 'https://api.x.ai/v1';

async function testGrokAPI() {
  console.log('🧪 Testing Grok API Connection...\n');

  if (!GROK_API_KEY) {
    console.error('❌ GROK_API_KEY not found in .env.local');
    process.exit(1);
  }

  console.log('✅ API Key found:', GROK_API_KEY.substring(0, 10) + '...');
  console.log('🌐 API URL:', GROK_API_URL);
  console.log('\n📤 Sending test request...\n');

  try {
    const response = await fetch(`${GROK_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Respond with valid JSON containing: replyText, videoState, and emotionalTone.'
          },
          {
            role: 'user',
            content: 'Hello! Just testing the API.'
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7
      })
    });

    console.log('📊 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      process.exit(1);
    }

    const data = await response.json();
    console.log('\n✅ API Response received!');
    console.log('📝 Response:', JSON.stringify(data, null, 2));

    if (data.choices && data.choices[0]) {
      console.log('\n💬 AI Message:', data.choices[0].message.content);

      // Try parsing the JSON response
      try {
        const parsed = JSON.parse(data.choices[0].message.content);
        console.log('\n✅ JSON Parsed Successfully:');
        console.log('   Reply:', parsed.replyText);
        console.log('   State:', parsed.videoState);
        console.log('   Tone:', parsed.emotionalTone);
      } catch (e) {
        console.log('\n⚠️  Response is not JSON formatted');
      }
    }

    console.log('\n🎉 SUCCESS! Grok API is working correctly.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

testGrokAPI();
