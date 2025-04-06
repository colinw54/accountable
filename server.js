import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

// Configure dotenv
dotenv.config();

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// Initialize OpenAI client
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint for OpenAI
app.post('/api/openai', async (req, res) => {
    try {
        const { message } = req.body;
        console.log('Received message:', message);
        
        if (!process.env.OPENAI_API_KEY) {
            console.error('OpenAI API key is not set');
            return res.status(500).json({ 
                error: 'Server configuration error',
                details: 'OpenAI API key is not set'
            });
        }

        console.log('Making OpenAI API call...');
        try {
            const completion = await client.chat.completions.create({
                model: "gpt-4o",  // Using 3.5-turbo for better rate limits
                messages: [
                    {
                        role: "system",
                        content: `You are a helpful AI assistant that helps users plan their day. 
                        When the user provides schedule information, extract activities, a brief descrption and their times.
                        Return each activity in the format of a tuple: (activity name, start time, end time, description).
                        Example response format:
                        (Class, 12:00, 14:00, Math class in room 101)
                        (Work, 15:00, 16:00, Team meeting)
                        Only return the tuples, one per line, no additional text.`
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                temperature: 0.7,
                max_tokens: 150
            });

            console.log('OpenAI API call successful');
            const response = completion.choices[0].message.content;
            console.log('OpenAI response:', response);
            
            // Split the response into lines and parse each tuple
            const activities = response.split('\n')
                .filter(line => line.trim().startsWith('('))
                .map(line => {
                    // Remove parentheses and split by commas
                    const [name, start, end, description] = line
                        .replace(/[()]/g, '')
                        .split(',')
                        .map(item => item.trim());
                    
                    return {
                        name,
                        startTime: start,
                        endTime: end,
                        description
                    };
                });

            console.log('Parsed activities:', activities);
            res.json({ activities });
        } catch (apiError) {
            console.error('OpenAI API Error:', apiError);
            res.status(500).json({ 
                error: 'OpenAI API Error',
                details: apiError.message
            });
        }
    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ 
            error: 'Server Error',
            details: error.message
        });
    }
});

// Serve the main application
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
}); 