// DOM Elements
const currentDateElement = document.getElementById('currentDate');
const scheduleItemsContainer = document.getElementById('scheduleItems');
const timelineContainer = document.querySelector('.timeline');
const planButton = document.getElementById('planButton');
const chatModal = document.getElementById('chatModal');
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const closeButton = document.querySelector('.close');

// OpenAI Configuration
const OPENAI_API_KEY = ''; // Add your API key here
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    updateCurrentDate();
    setupTimeline();
    setupEventListeners();
});

// Update current date display
function updateCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateElement.textContent = now.toLocaleDateString('en-US', options);
}

// Setup timeline with hourly markers
function setupTimeline() {
    timelineContainer.innerHTML = '';
    for (let hour = 0; hour < 24; hour++) {
        const timeMarker = document.createElement('div');
        timeMarker.className = 'time-marker';
        
        const timeLabel = document.createElement('span');
        timeLabel.className = 'time-label';
        timeLabel.textContent = formatHour(hour);
        
        timeMarker.appendChild(timeLabel);
        timelineContainer.appendChild(timeMarker);
    }
}

// Format hour to 12-hour format with AM/PM
function formatHour(hour) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour} ${period}`;
}

// Convert time string to minutes since midnight
function timeToMinutes(timeStr) {
    const [time, period] = timeStr.split(/(?=[AP]M)/i);
    const [hours, minutes] = time.split(':').map(Number);
    let totalMinutes = hours * 60 + (minutes || 0);
    if (period.toLowerCase() === 'pm' && hours !== 12) {
        totalMinutes += 12 * 60;
    }
    if (period.toLowerCase() === 'am' && hours === 12) {
        totalMinutes -= 12 * 60;
    }
    return totalMinutes;
}

// Setup event listeners
function setupEventListeners() {
    planButton.addEventListener('click', openChatModal);
    closeButton.addEventListener('click', closeChatModal);
    sendButton.addEventListener('click', handleUserMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleUserMessage();
        }
    });
}

// Modal functions
function openChatModal() {
    chatModal.style.display = 'block';
    addBotMessage("Hello! I'm your AI assistant. How can I help you plan your day?");
}

function closeChatModal() {
    chatModal.style.display = 'none';
}

// Chat functions
function addBotMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message bot';
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addUserMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message user';
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function handleUserMessage() {
    const message = userInput.value.trim();
    if (message) {
        addUserMessage(message);
        userInput.value = '';
        
        try {
            const response = await callOpenAI(message);
            addBotMessage(response);
            
            // Check if the response contains schedule information
            const scheduleItem = parseScheduleMessage(response);
            if (scheduleItem) {
                addScheduleItem(scheduleItem);
            }
        } catch (error) {
            console.error('Error:', error);
            addBotMessage("I'm sorry, I encountered an error. Please try again.");
        }
    }
}

async function callOpenAI(message) {
    const messages = [
        {
            role: "system",
            content: "You are a helpful AI assistant that helps users plan their day. You should help them schedule activities and provide time management advice. When suggesting activities, always include a specific time and importance level (high/medium/low)."
        },
        {
            role: "user",
            content: message
        }
    ];

    const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: messages,
            temperature: 0.7,
            max_tokens: 150
        })
    });

    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// Parse schedule message
function parseScheduleMessage(message) {
    const timeMatch = message.match(/\d{1,2}(?::\d{2})?\s*(?:am|pm)/i);
    if (!timeMatch) return null;
    
    const time = timeMatch[0];
    const importance = message.match(/high|medium|low/i)?.[0] || 'medium';
    const titleMatch = message.match(/schedule|add|plan\s+(.*?)\s+at/i);
    const title = titleMatch ? titleMatch[1].trim() : message.replace(time, '').replace(importance, '').trim();
    
    return {
        title,
        time,
        importance
    };
}

// Add schedule item to the UI
function addScheduleItem(item) {
    const scheduleItem = document.createElement('div');
    scheduleItem.className = `schedule-item ${item.importance}`;
    
    // Calculate position based on time
    const minutes = timeToMinutes(item.time);
    const topPosition = (minutes / 60) * 100; // Convert to percentage
    
    scheduleItem.style.top = `${topPosition}%`;
    scheduleItem.innerHTML = `
        <h3>${item.title}</h3>
        <p>Time: ${item.time}</p>
        <p>Importance: ${item.importance}</p>
    `;
    scheduleItemsContainer.appendChild(scheduleItem);
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === chatModal) {
        closeChatModal();
    }
}); 