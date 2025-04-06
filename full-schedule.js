// Import configuration
import config from './config.js';

// DOM Elements
const scheduleContainer = document.getElementById('scheduleContainer');
const planButton = document.getElementById('planButton');
const chatModal = document.getElementById('chatModal');
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const closeButton = document.querySelector('.close');

// OpenAI Configuration
const OPENAI_API_KEY = config.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupCalendarGrid();
});

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

// Setup calendar grid
function setupCalendarGrid() {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Create header row with days of the week
    const headerRow = document.createElement('div');
    headerRow.className = 'calendar-row header';
    daysOfWeek.forEach(day => {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-cell day-header';
        dayCell.textContent = day;
        headerRow.appendChild(dayCell);
    });
    scheduleContainer.appendChild(headerRow);
    
    // Get first day of month and total days in month
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const totalDays = lastDay.getDate();
    
    let currentWeekRow = document.createElement('div');
    currentWeekRow.className = 'calendar-row';
    
    // Add empty cells for days before the first of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-cell empty';
        currentWeekRow.appendChild(emptyCell);
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= totalDays; day++) {
        if ((day + firstDay.getDay() - 1) % 7 === 0 && day !== 1) {
            scheduleContainer.appendChild(currentWeekRow);
            currentWeekRow = document.createElement('div');
            currentWeekRow.className = 'calendar-row';
        }
        
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-cell';
        if (day === today.getDate()) {
            dayCell.classList.add('today');
        }
        
        const dateNumber = document.createElement('div');
        dateNumber.className = 'date-number';
        dateNumber.textContent = day;
        
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'events-container';
        
        dayCell.appendChild(dateNumber);
        dayCell.appendChild(eventsContainer);
        currentWeekRow.appendChild(dayCell);
    }
    
    // Add remaining empty cells and append final week
    const remainingCells = 7 - (totalDays + firstDay.getDay()) % 7;
    if (remainingCells < 7) {
        for (let i = 0; i < remainingCells; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-cell empty';
            currentWeekRow.appendChild(emptyCell);
        }
    }
    scheduleContainer.appendChild(currentWeekRow);
}

// Modal functions
function openChatModal() {
    chatModal.style.display = 'block';
    addBotMessage("Hello! I'm your AI assistant. How can I help you plan your schedule?");
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
            content: "You are a helpful AI assistant that helps users plan their schedule. You should help them schedule activities and provide time management advice. When suggesting activities, always include a specific date, time, and importance level (high/medium/low)."
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
    const dateMatch = message.match(/\b\d{1,2}\/\d{1,2}(?:\/\d{4})?\b/);
    const timeMatch = message.match(/\d{1,2}(?::\d{2})?\s*(?:am|pm)/i);
    if (!dateMatch || !timeMatch) return null;
    
    const date = dateMatch[0];
    const time = timeMatch[0];
    const importance = message.match(/high|medium|low/i)?.[0] || 'medium';
    const titleMatch = message.match(/schedule|add|plan\s+(.*?)\s+(?:on|at)/i);
    const title = titleMatch ? titleMatch[1].trim() : message.replace(date, '').replace(time, '').replace(importance, '').trim();
    
    return {
        title,
        date,
        time,
        importance
    };
}

// Add schedule item to the UI
function addScheduleItem(item) {
    const [month, day] = item.date.split('/');
    const cells = document.querySelectorAll('.calendar-cell:not(.empty):not(.day-header)');
    const targetCell = Array.from(cells).find(cell => 
        parseInt(cell.querySelector('.date-number').textContent) === parseInt(day)
    );
    
    if (targetCell) {
        const eventElement = document.createElement('div');
        eventElement.className = `event-item ${item.importance}`;
        eventElement.innerHTML = `
            <span class="event-time">${item.time}</span>
            <span class="event-title">${item.title}</span>
        `;
        targetCell.querySelector('.events-container').appendChild(eventElement);
    }
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === chatModal) {
        closeChatModal();
    }
}); 