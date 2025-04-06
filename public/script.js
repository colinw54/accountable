// DOM Elements
const timeColumn = document.querySelector('.time-column');
const scheduleItems = document.querySelector('.schedule-items');
const userInput = document.querySelector('.chat-input input');
const sendButton = document.querySelector('.chat-input button');
const chatMessages = document.querySelector('.chat-messages');
const currentDateElement = document.getElementById('currentDate');

// Modal Elements
const modal = document.getElementById('eventModal');
const modalTitle = document.getElementById('modalTitle');
const modalTime = document.getElementById('modalTime');
const modalDescription = document.getElementById('modalDescription');
const modalPriority = document.getElementById('modalPriority');
const closeButton = document.querySelector('.close');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing...');
    updateCurrentDate();
    initializeTimeline();
    addMessageToChat('Plan your day!');
    setupEventListeners();
    setupModalListeners();
});

// Update current date display
function updateCurrentDate() {
    if (!currentDateElement) return;
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateElement.textContent = now.toLocaleDateString('en-US', options);
}

// Initialize timeline
function initializeTimeline() {
    const timeColumn = document.querySelector('.time-column');
    const scheduleItems = document.querySelector('.schedule-items');
    
    if (!timeColumn || !scheduleItems) {
        console.error('Required timeline elements not found');
        return;
    }

    // Clear existing content
    timeColumn.innerHTML = '';
    scheduleItems.innerHTML = '';
    
    // Create time slots from 6 AM to 12 AM (midnight)
    for (let i = 6; i < 24; i++) {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        timeSlot.textContent = `${i.toString().padStart(2, '0')}:00`;
        timeColumn.appendChild(timeSlot);
    }

    // Set up the schedule container
    scheduleItems.style.position = 'relative';
    scheduleItems.style.height = '1080px'; // 18 hours * 60px
}

// Setup modal event listeners
function setupModalListeners() {
    closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Show event details in modal
function showEventDetails(event) {
    modalTitle.textContent = event.name;
    modalTime.textContent = `${event.startTime} - ${event.endTime}`;
    modalDescription.textContent = event.description || 'No description provided';
    
    // Set priority class and text
    modalPriority.className = 'modal-priority';
    modalPriority.classList.add(event.priority || 'medium');
    modalPriority.textContent = event.priority ? event.priority.charAt(0).toUpperCase() + event.priority.slice(1) : 'Medium';
    
    modal.style.display = 'block';
}

// Add event to timeline
function addEventToTimeline(event) {
    const { name, startTime, endTime, description, priority } = event;
    
    // Parse start and end times
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    // Calculate positions (1px per minute), offset by 6 hours (360 minutes)
    const startPosition = (startHour * 60 + startMinute) - 360;
    const endPosition = (endHour * 60 + endMinute) - 360;
    const duration = endPosition - startPosition;
    
    // Skip events that end before 6 AM or start after midnight
    if (endPosition < 0 || startPosition > 1080) {
        return;
    }
    
    // Create event block
    const eventBlock = document.createElement('div');
    eventBlock.className = `event-block ${priority || 'medium'}`;
    eventBlock.style.position = 'absolute';
    eventBlock.style.top = `${Math.max(0, startPosition)}px`;
    eventBlock.style.height = `${duration}px`;
    eventBlock.style.left = '0';
    eventBlock.style.right = '0';
    eventBlock.style.margin = '0 4px';
    eventBlock.style.cursor = 'pointer';
    eventBlock.innerHTML = `
        <strong>${name}</strong>
        <small>${startTime} - ${endTime}</small>
        ${description ? `<br><small>${description}</small>` : ''}
    `;
    
    // Add click handler
    eventBlock.addEventListener('click', () => showEventDetails(event));
    
    // Add to timeline
    const scheduleItems = document.querySelector('.schedule-items');
    if (scheduleItems) {
        scheduleItems.appendChild(eventBlock);
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
        handleUserMessage(message);
        userInput.value = '';
    }
}

// Handle user message
async function handleUserMessage(message) {
    try {
        addMessageToChat(message, true);
        
        console.log('Sending request to server...');
        const response = await fetch('http://localhost:8000/api/openai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        console.log('Server response status:', response.status);
        const data = await response.json();
        console.log('Server response data:', data);

        if (!response.ok) {
            throw new Error(data.details || data.error || 'Failed to get AI response');
        }

        if (!data.activities || !Array.isArray(data.activities)) {
            throw new Error('Invalid response format from server');
        }
        
        // Add each activity to the timeline
        data.activities.forEach(activity => {
            console.log('Adding activity:', activity);
            addEventToTimeline(activity);
        });

        // Add AI response to chat
        addMessageToChat('I\'ve added these activities to your schedule!');
    } catch (error) {
        console.error('Error:', error);
        addMessageToChat(`Sorry, I couldn't process your request: ${error.message}`);
    }
}

// Add message to chat
function addMessageToChat(message, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    messageDiv.textContent = message;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
} 