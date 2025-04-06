// DOM Elements
const scheduleContainer = document.getElementById('scheduleContainer');
const planButton = document.getElementById('planButton');
const chatModal = document.getElementById('chatModal');
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const closeButton = document.querySelector('.close');
const currentMonthElement = document.getElementById('currentMonth');
const prevMonthButton = document.getElementById('prevMonth');
const nextMonthButton = document.getElementById('nextMonth');
const calendarGrid = document.querySelector('.calendar-grid');

// Calendar state
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initializeCalendar();
});

// Initialize calendar
function initializeCalendar() {
    if (!calendarGrid) return;
    
    // Create day headers
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => {
        const header = document.createElement('div');
        header.className = 'day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });

    // Initial render
    updateMonthDisplay();
    renderCalendar();
}

// Setup event listeners
function setupEventListeners() {
    if (planButton) planButton.addEventListener('click', openChatModal);
    if (closeButton) closeButton.addEventListener('click', closeChatModal);
    if (sendButton) sendButton.addEventListener('click', handleUserMessage);
    if (userInput) {
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleUserMessage();
            }
        });
    }
    
    if (prevMonthButton) {
        prevMonthButton.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            updateMonthDisplay();
            renderCalendar();
        });
    }
    
    if (nextMonthButton) {
        nextMonthButton.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            updateMonthDisplay();
            renderCalendar();
        });
    }
}

// Update month display
function updateMonthDisplay() {
    if (!currentMonthElement) return;
    const options = { year: 'numeric', month: 'long' };
    currentMonthElement.textContent = currentDate.toLocaleDateString('en-US', options);
}

// Render calendar
function renderCalendar() {
    if (!calendarGrid) return;
    
    // Clear existing calendar
    while (calendarGrid.children.length > 7) {
        calendarGrid.removeChild(calendarGrid.lastChild);
    }

    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startingDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'day-cell';
        calendarGrid.appendChild(emptyCell);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= totalDays; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';
        
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        if (isToday(date)) {
            dayCell.classList.add('today');
        }

        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayCell.appendChild(dayNumber);

        const dayEvents = document.createElement('div');
        dayEvents.className = 'day-events';
        dayCell.appendChild(dayEvents);

        // Add hour blocks
        for (let hour = 0; hour < 24; hour++) {
            const hourBlock = document.createElement('div');
            hourBlock.className = 'hour-block';
            hourBlock.dataset.hour = hour;
            dayEvents.appendChild(hourBlock);
        }

        calendarGrid.appendChild(dayCell);
    }
}

// Check if date is today
function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

// Add event to calendar
function addEventToCalendar(event) {
    const { date, time, title, importance } = event;
    const [hours, minutes] = time.split(':').map(Number);
    const eventDate = new Date(date);
    
    const dayCell = document.querySelector(`.day-cell:nth-child(${eventDate.getDate() + eventDate.getDay()})`);
    if (dayCell) {
        const hourBlock = dayCell.querySelector(`.hour-block[data-hour="${hours}"]`);
        if (hourBlock) {
            const eventElement = document.createElement('div');
            eventElement.className = `event ${importance}`;
            eventElement.textContent = `${time} - ${title}`;
            eventElement.style.top = `${(minutes / 60) * 100}%`;
            eventElement.style.height = '30px';
            hourBlock.appendChild(eventElement);
        }
    }
}

// Modal functions
function openChatModal() {
    if (!chatModal) return;
    chatModal.style.display = 'block';
    addBotMessage("Hello! I'm your AI assistant. How can I help you plan your schedule?");
}

function closeChatModal() {
    if (!chatModal) return;
    chatModal.style.display = 'none';
}

// Chat functions
function addBotMessage(message) {
    if (!chatMessages) return;
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message bot';
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addUserMessage(message) {
    if (!chatMessages) return;
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message user';
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function handleUserMessage() {
    if (!userInput) return;
    const message = userInput.value.trim();
    if (message) {
        addUserMessage(message);
        userInput.value = '';
        
        try {
            // For testing, create a sample event
            const sampleEvent = {
                date: new Date().toISOString().split('T')[0],
                time: '14:30',
                title: 'Test Event',
                importance: 'medium'
            };
            addEventToCalendar(sampleEvent);
            
            addBotMessage('I\'ve added a test event to your schedule.');
        } catch (error) {
            console.error('Error:', error);
            addBotMessage('Sorry, I encountered an error. Please try again.');
        }
    }
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (chatModal && event.target === chatModal) {
        closeChatModal();
    }
}); 