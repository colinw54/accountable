// DOM Elements
const timeColumn = document.querySelector('.time-column');
const scheduleItems = document.querySelector('.schedule-items');
const schedulerInput = document.querySelector('.scheduler-assistant input');
const schedulerSendButton = document.querySelector('.scheduler-assistant .send-btn');
const schedulerMessages = document.querySelector('.scheduler-messages');
const notificationMessages = document.querySelector('.notification-messages');
const notificationInput = document.querySelector('.notification-assistant .chat-input input');
const notificationSendButton = document.querySelector('.notification-assistant .send-btn');
const notificationVoiceButton = document.querySelector('.notification-assistant .voice-chat-btn');
const currentDateElement = document.getElementById('currentDate');
const tabButtons = document.querySelectorAll('.tab-button');
const notificationBadge = document.querySelector('.notification-badge');

// Modal Elements
const modal = document.getElementById('eventModal');
const modalTitle = document.getElementById('modalTitle');
const modalTime = document.getElementById('modalTime');
const modalDescription = document.getElementById('modalDescription');
const modalPriority = document.getElementById('modalPriority');
const closeButton = document.querySelector('.close');

// Voice chat functionality
let recognition = null;
if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
}

const voiceChatBtn = document.querySelector('.voice-chat-btn');
const chatInput = document.querySelector('.chat-input input');

// Keep track of pending acknowledgments
let pendingAcknowledgments = new Map();

let pendingNotifications = 0;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing...');
    updateCurrentDate();
    initializeTimeline();
    loadActivities();
    addMessageToScheduler('How can I help you plan your day?');
    addMessageToNotifications('I\'ll notify you when your events are starting! 🔔');
    setupEventListeners();
    setupModalListeners();
    setupTabListeners();
    if (voiceChatBtn && recognition) {
        voiceChatBtn.addEventListener('click', toggleVoiceChat);
    }
    startReminderChecks();
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

// Load activities for current date
async function loadActivities() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`/api/activities/${today}`);
        const activities = await response.json();
        
        // Clear existing events
        const scheduleItems = document.querySelector('.schedule-items');
        if (scheduleItems) {
            scheduleItems.innerHTML = '';
        }

        // Add each activity to the timeline
        activities.forEach(activity => {
            addEventToTimeline(activity);
        });
    } catch (error) {
        console.error('Error loading activities:', error);
        addMessageToScheduler('Failed to load activities. Please try again.');
    }
}

// Delete an activity
async function deleteActivity(id) {
    try {
        const response = await fetch(`/api/activities/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete activity');
        }

        // Reload activities to refresh the view
        await loadActivities();
        addMessageToScheduler('Activity deleted successfully');
    } catch (error) {
        console.error('Error deleting activity:', error);
        addMessageToScheduler('Failed to delete activity. Please try again.');
    }
}

// Show event details in modal
function showEventDetails(event) {
    const modal = document.getElementById('eventModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalTime = document.getElementById('modalTime');
    const modalDescription = document.getElementById('modalDescription');
    const modalPriority = document.getElementById('modalPriority');

    if (modal && modalTitle && modalTime && modalDescription && modalPriority) {
        modalTitle.textContent = event.name;
        modalTime.textContent = `${event.startTime} - ${event.endTime}`;
        modalDescription.textContent = event.description || 'No description';
        modalPriority.textContent = `Type: ${event.type || 'default'}`;

        // Add delete button if the event has an ID
        const existingDeleteBtn = modal.querySelector('.delete-btn');
        if (existingDeleteBtn) {
            existingDeleteBtn.remove();
        }

        if (event._id) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = 'Delete Event';
            deleteBtn.onclick = () => {
                deleteActivity(event._id);
                modal.style.display = 'none';
            };
            modal.querySelector('.modal-content').appendChild(deleteBtn);
        }

        modal.style.display = 'block';
    }
}

// Add event to timeline
function addEventToTimeline(event) {
    const { name, startTime, endTime, description } = event;
    
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
    
    // Randomly select an event type
    const eventTypes = ['work', 'personal', 'health', 'education', 'social', 'default'];
    const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    
    // Create event block
    const eventBlock = document.createElement('div');
    eventBlock.className = `event-block ${randomType}`;
    eventBlock.style.position = 'absolute';
    eventBlock.style.top = `${Math.max(0, startPosition)}px`;
    eventBlock.style.height = `${duration}px`;
    eventBlock.style.left = '0';
    eventBlock.style.right = '0';
    eventBlock.style.margin = '0 4px';
    
    // Store start time in dataset
    eventBlock.dataset.startTime = startTime;
    eventBlock.dataset.name = name;
    
    eventBlock.innerHTML = `
        <strong>${name}</strong>
        ${description ? `<br><small>${description}</small>` : ''}
    `;
    
    // Add click handler
    eventBlock.addEventListener('click', () => showEventDetails({...event, type: randomType}));
    
    // Add to timeline
    const scheduleItems = document.querySelector('.schedule-items');
    if (scheduleItems) {
        scheduleItems.appendChild(eventBlock);
    }
}

// Setup event listeners
function setupEventListeners() {
    schedulerSendButton.addEventListener('click', () => {
        const message = schedulerInput.value.trim();
        if (message) {
            handleUserMessage(message);
            schedulerInput.value = '';
        }
    });

    schedulerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const message = schedulerInput.value.trim();
            if (message) {
                handleUserMessage(message);
                schedulerInput.value = '';
            }
        }
    });

    // New notification listeners
    if (notificationSendButton && notificationInput) {
        notificationSendButton.addEventListener('click', () => {
            const message = notificationInput.value.trim();
            if (message) {
                handleNotificationAcknowledgment(message);
                notificationInput.value = '';
            }
        });

        notificationInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const message = notificationInput.value.trim();
                if (message) {
                    handleNotificationAcknowledgment(message);
                    notificationInput.value = '';
                }
            }
        });
    }

    // Voice recognition for notifications
    if (notificationVoiceButton && recognition) {
        notificationVoiceButton.addEventListener('click', toggleNotificationVoiceChat);
    }
}

// Handle user message
async function handleUserMessage(message) {
    try {
        addMessageToScheduler(message, true);
        
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

        // Add AI response to scheduler chat
        addMessageToScheduler('I\'ve added these activities to your schedule!');
        } catch (error) {
            console.error('Error:', error);
        addMessageToScheduler(`Sorry, I couldn't process your request: ${error.message}`);
    }
}

function toggleVoiceChat() {
    if (recognition.started) {
        stopVoiceChat();
    } else {
        startVoiceChat();
    }
}

function startVoiceChat() {
    recognition.start();
    voiceChatBtn.classList.add('active');
    voiceChatBtn.title = 'Stop voice chat';
}

function stopVoiceChat() {
    recognition.stop();
    voiceChatBtn.classList.remove('active');
    voiceChatBtn.title = 'Start voice chat';
}

recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    chatInput.value = transcript;
    stopVoiceChat();
};

recognition.onend = () => {
    stopVoiceChat();
};

recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    stopVoiceChat();
};

// Function to calculate milliseconds until next minute
function getMillisecondsUntilNextMinute() {
    const now = new Date();
    return (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
}

// Function to start checking reminders at the beginning of each minute
function startReminderChecks() {
    // First, calculate the delay until the next minute starts
    const initialDelay = getMillisecondsUntilNextMinute();
    
    // Set a timeout to start the interval at the beginning of the next minute
    setTimeout(() => {
        checkForReminders(); // Check immediately when the minute starts
        // Then set up the interval to check every minute
        setInterval(checkForReminders, 60000); // 60000 ms = 1 minute
    }, initialDelay);
}

async function checkForReminders() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Get all event blocks
    const events = document.querySelectorAll('.event-block');
    
    for (const event of events) {
        const eventData = event.dataset;
        const [startHour, startMinute] = eventData.startTime.split(':').map(Number);
        
        // Check if the event is starting now
        if (startHour === currentHour && startMinute === currentMinute) {
            const eventName = event.querySelector('strong').textContent;
            
            try {
                // Get AI-generated acknowledgment message
                const response = await fetch('http://localhost:8000/api/openai', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: `Generate a creative acknowledgment message with a positive tone for the event "${eventName}" for a user to say aloud. The message should be unique and specific to this event.`
                    })
                });

                const data = await response.json();
                let acknowledgmentMessage;
                
                if (data.response) {
                    // Extract the actual message from the AI response
                    // Remove any quotes or special formatting
                    acknowledgmentMessage = data.response.replace(/^["']|["']$/g, '').trim();
                } else {
                    // Fallback message if no AI response
                    acknowledgmentMessage = `I'm ready to begin ${eventName} and will give it my full attention!`;
                }
                
                // Store the acknowledgment message
                pendingAcknowledgments.set(eventName, acknowledgmentMessage);
                
                // Add notification with the acknowledgment requirement
                const message = `
                    🔔 "${eventName}" is starting now!
                    
                    Please acknowledge this event by saying or typing exactly:
                    "${acknowledgmentMessage}"
                `;
                
                addMessageToNotifications(message);
                
                // Play notification sound if enabled
                if (document.documentElement.hasAttribute('data-user-interacted')) {
                    const audio = new Audio('data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=');
                    audio.play().catch(error => console.log('Audio playback failed:', error));
                }
                
                // Add AI message to scheduler chat requesting acknowledgment
                addMessageToScheduler(`Please acknowledge the event "${eventName}" in the notifications tab by repeating the provided message.`);
                
            } catch (error) {
                console.error('Error getting acknowledgment message:', error);
                // Use a fallback message if the API call fails
                const fallbackMessage = `I'm ready to begin ${eventName} and will give it my full attention!`;
                pendingAcknowledgments.set(eventName, fallbackMessage);
                addMessageToNotifications(`
                    🔔 "${eventName}" is starting now!
                    
                    Please acknowledge this event by saying or typing exactly:
                    "${fallbackMessage}"
                `);
            }
        }
    }
}

// Add message to scheduler chat
function addMessageToScheduler(message, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    messageDiv.textContent = message;
    schedulerMessages.appendChild(messageDiv);
    schedulerMessages.scrollTop = schedulerMessages.scrollHeight;
}

// Setup tab listeners
function setupTabListeners() {
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.chat-container').forEach(container => container.classList.remove('active'));
            
            // Add active class to clicked tab
            button.classList.add('active');
            const tabName = button.getAttribute('data-tab');
            document.querySelector(`[data-tab-content="${tabName}"]`).classList.add('active');
            
            // If switching to notifications tab, reset the badge
            if (tabName === 'notifications') {
                resetNotificationBadge();
            }
        });
    });
}

// Update notification badge
function updateNotificationBadge() {
    pendingNotifications++;
    notificationBadge.textContent = pendingNotifications;
    notificationBadge.style.display = 'block';
    
    // If we're not on the notifications tab, highlight the tab
    if (!document.querySelector('[data-tab-content="notifications"]').classList.contains('active')) {
        document.querySelector('[data-tab="notifications"]').classList.add('has-notifications');
    }
}

// Reset notification badge
function resetNotificationBadge() {
    pendingNotifications = 0;
    notificationBadge.style.display = 'none';
    document.querySelector('[data-tab="notifications"]').classList.remove('has-notifications');
}

// Update addMessageToNotifications to handle badge
function addMessageToNotifications(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'notification-message';
    
    // Split message into parts if it contains multiple lines
    const messageParts = message.split('\n').map(part => part.trim());
    
    messageDiv.innerHTML = `
        <span class="notification-icon">🔔</span>
        <div class="notification-content">
            ${messageParts.map(part => `<p>${part}</p>`).join('')}
        </div>
    `;
    
    notificationMessages.appendChild(messageDiv);
    notificationMessages.scrollTop = notificationMessages.scrollHeight;
    
    // Update notification badge if not viewing notifications tab
    if (!document.querySelector('[data-tab-content="notifications"]').classList.contains('active')) {
        updateNotificationBadge();
    }
    
    // Only play sound if the document has been interacted with
    if (document.documentElement.hasAttribute('data-user-interacted')) {
        const audio = new Audio('data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=');
                    audio.play().catch(error => console.log('Audio playback failed:', error));
                }
    }
    

// Add event listener for first user interaction
document.addEventListener('click', function setUserInteracted() {
    document.documentElement.setAttribute('data-user-interacted', 'true');
    document.removeEventListener('click', setUserInteracted);
});

// Handle notification acknowledgment
function handleNotificationAcknowledgment(message) {
    // Check if the message matches any pending acknowledgments
    for (const [eventName, expectedMessage] of pendingAcknowledgments.entries()) {
        if (message.toLowerCase() === expectedMessage.toLowerCase()) {
            const timestamp = new Date().toLocaleTimeString();
            const acknowledgmentMessage = document.createElement('div');
            acknowledgmentMessage.className = 'notification-message success';
            acknowledgmentMessage.innerHTML = `
                <div class="notification-icon">✓</div>
                <div class="notification-content">
                    <p><strong>${timestamp}</strong></p>
                    <p>Event "${eventName}" successfully acknowledged!</p>
                </div>
            `;
            notificationMessages.appendChild(acknowledgmentMessage);
            notificationMessages.scrollTop = notificationMessages.scrollHeight;
            
            // Remove the acknowledged event from pending
            pendingAcknowledgments.delete(eventName);
            return;
        }
    }

    // If no match found, show error message
    const timestamp = new Date().toLocaleTimeString();
    const errorMessage = document.createElement('div');
    errorMessage.className = 'notification-message error';
    errorMessage.innerHTML = `
        <div class="notification-icon">❌</div>
        <div class="notification-content">
            <p><strong>${timestamp}</strong></p>
            <p>This message doesn't match any pending acknowledgments. Please try again with the exact message provided.</p>
        </div>
    `;
    notificationMessages.appendChild(errorMessage);
    notificationMessages.scrollTop = notificationMessages.scrollHeight;
}

// Toggle voice chat for notifications
function toggleNotificationVoiceChat() {
    if (recognition.started) {
        stopNotificationVoiceChat();
    } else {
        startNotificationVoiceChat();
    }
}

function startNotificationVoiceChat() {
    recognition.start();
    notificationVoiceButton.classList.add('active');
    notificationInput.placeholder = 'Listening...';
}

function stopNotificationVoiceChat() {
    recognition.stop();
    notificationVoiceButton.classList.remove('active');
    notificationInput.placeholder = 'Type your acknowledgment...';
}

// Update recognition handlers
recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    notificationInput.value = transcript;
    handleNotificationAcknowledgment(transcript);
    stopNotificationVoiceChat();
};

recognition.onend = () => {
    stopNotificationVoiceChat();
};

recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    stopNotificationVoiceChat();
    addMessageToNotifications('❌ Voice input error. Please try again or use text input.');
}; 