import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
dotenv.config();

// Initialize OpenAI client
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function testAPI() {
    try {
        console.log('Testing OpenAI API key...');
        
        if (!process.env.OPENAI_API_KEY) {
            console.error('❌ OpenAI API key is not set in .env file');
            return;
        }

        console.log('✅ API key found in .env file');
        console.log('API Key (first 7 chars):', process.env.OPENAI_API_KEY.substring(0, 7) + '...');
        
        // Make a simple API call
        const completion = await client.chat.completions.create({
            model: "gpt-3.5-turbo",  // Try with 3.5-turbo first as it has higher rate limits
            messages: [
                {
                    role: "user",
                    content: "Hello, this is a test message."
                }
            ],
            max_tokens: 5
        });

        console.log('✅ API call successful!');
        console.log('Response:', completion.choices[0].message.content);
        
    } catch (error) {
        console.error('❌ API Error:', error.message);
        console.error('Error type:', error.type);
        console.error('Error code:', error.code);
        if (error.response) {
            console.error('Error details:', error.response.data);
        }
        if (error.status === 429) {
            console.error('Rate limit error. This could mean:');
            console.error('1. The API key is from a free tier with low limits');
            console.error('2. The key is shared with others who have used up the quota');
            console.error('3. The key is invalid or expired');
        }
    }
}

testAPI(); 