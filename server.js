import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8000;

// Improved MongoDB connection with retry logic
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        // Don't exit the process, let it retry
        setTimeout(connectDB, 5000);
    }
};

connectDB();

// Activity Schema
const activitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        enum: ['work', 'personal', 'health', 'education', 'social', 'default'],
        default: 'default'
    },
    date: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const Activity = mongoose.model('Activity', activitySchema);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for all routes except /api
app.get('*', (req, res, next) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        next();
    }
});

// Initialize OpenAI
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Get all activities
app.get('/api/activities', async (req, res) => {
    try {
        const activities = await Activity.find({})
            .sort({ date: -1, startTime: 1 });
        res.json(activities);
    } catch (error) {
        console.error('Error fetching all activities:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Get all activities for a specific date
app.get('/api/activities/:date', async (req, res) => {
    try {
        const date = new Date(req.params.date);
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));

        const activities = await Activity.find({
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        }).sort('startTime');

        res.json(activities);
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

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
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: `You are a helpful AI accountability partner that helps users plan their day. When the user provides a description of their day's plan, extract each activity along with its name, start time, end time, and a brief description.

Format each activity as a tuple:
(activity name, start time, end time, description)

- Times should be in 24-hour format.
- If the user specifies "evening", "PM", or similar, apply a +12 hour offset to convert to 24-hour format.
- If the time isn't precise (e.g., "early morning"), do your best to reasonably estimate.
- Return one tuple per line.
- Only return the tuples — no introductory text, no explanations.

**Example Input:**
I have a math class from noon to 2pm, then a team meeting at 3pm for one hour.

**Example Output:**
(Class, 12:00, 14:00, Math class)  
(Work, 15:00, 16:00, Team meeting)
`

                        
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
                        description,
                        date: new Date()
                    };
                });

            // Save activities to database
            const savedActivities = await Activity.insertMany(activities);
            console.log('Saved activities:', savedActivities);

            res.json({ activities: savedActivities });
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

// Acknowledgment message generation endpoint
app.post('/api/ackl', async (req, res) => {
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
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are an AI assistant that generates acknowledgment messages based on different themes. For depressing theme, be melancholic but determined. For motivational theme, be enthusiastic and energetic. For disciplined theme, be focused and professional. Generate a concise, one-sentence acknowledgment message that matches the requested theme."
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
            const responseText = completion.choices[0].message.content.trim();
            console.log('OpenAI response:', responseText);

            // Return the generated string
            res.json({ response: responseText });
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

// Delete an activity
app.delete('/api/activities/:id', async (req, res) => {
    try {
        const activity = await Activity.findByIdAndDelete(req.params.id);
        if (!activity) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        res.json({ message: 'Activity deleted successfully' });
    } catch (error) {
        console.error('Error deleting activity:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 