// DOM Elements
const timeColumn = document.querySelector('.time-column');
const scheduleItems = document.querySelector('.schedule-items');
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing...');
    initializeTimeline();
    setupEventListeners();
});

// Initialize timeline
function initializeTimeline() {
    console.log('Initializing timeline...');
    
    if (!timeColumn || !scheduleItems) {
        console.error('Required timeline elements not found');
        return;
    }

    // Clear existing content
    timeColumn.innerHTML = '';
    scheduleItems.innerHTML = '';

    // Create time slots and event slots
    for (let hour = 0; hour < 24; hour++) {
        // Create time slot
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        timeSlot.textContent = `${hour.toString().padStart(2, '0')}:00`;
        timeColumn.appendChild(timeSlot);

        // Create event slot
        const eventSlot = document.createElement('div');
        eventSlot.className = 'event-slot';
        eventSlot.dataset.hour = hour;
        scheduleItems.appendChild(eventSlot);
    }
}

// Add event to timeline
function addEventToTimeline(event) {
    const { time, title, importance } = event;
    const [hours, minutes] = time.split(':').map(Number);
    const eventSlot = document.querySelector(`.event-slot[data-hour="${hours}"]`);
    
    if (eventSlot) {
        const eventBlock = document.createElement('div');
        eventBlock.className = `event-block ${importance}`;
        eventBlock.textContent = `${time} - ${title}`;
        
        // Calculate position based on minutes
        const topPosition = (minutes / 60) * 60;
        eventBlock.style.top = `${topPosition}px`;
        eventBlock.style.height = '30px';
        
        eventSlot.appendChild(eventBlock);
    }
}

// Setup event listeners
function setupEventListeners() {
    if (sendButton && userInput) {
        sendButton.addEventListener('click', handleSendMessage);
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSendMessage();
            }
        });
    }
}

// Handle send message
function handleSendMessage() {
    const message = userInput.value.trim();
    if (message) {
        addMessageToChat('user', message);
        userInput.value = '';
        handleUserMessage(message);
    }
}

// Handle user message
async function handleUserMessage(message) {
    try {
        // For testing, create a sample event
        const sampleEvent = {
            time: '14:30',
            title: 'Test Event',
            importance: 'medium'
        };
        addEventToTimeline(sampleEvent);
        
        addMessageToChat('assistant', 'I\'ve added a test event to your schedule.');
    } catch (error) {
        console.error('Error:', error);
        addMessageToChat('assistant', 'Sorry, I encountered an error. Please try again.');
    }
}

// Add message to chat
function addMessageToChat(sender, message) {
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.textContent = message;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
} 