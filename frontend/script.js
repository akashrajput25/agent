const API_BASE_URL = window.location.origin;

const messagesContainer = document.getElementById('messagesContainer');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const errorMessage = document.getElementById('errorMessage');

// Send message on button click
sendBtn.addEventListener('click', sendMessage);

// Send message on Enter key press
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Auto-grow textarea
userInput.addEventListener('input', (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
});

async function sendMessage() {
    const message = userInput.value.trim();
    
    if (!message) return;
    
    // Clear error message
    errorMessage.classList.remove('show');
    errorMessage.textContent = '';
    
    // Disable input and button
    userInput.disabled = true;
    sendBtn.disabled = true;
    
    // Add user message to chat
    addMessage(message, 'user');
    
    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';
    
    // Show loading indicator
    const loadingMsg = addMessage('', 'assistant');
    const loadingContent = loadingMsg.querySelector('.message-content');
    loadingContent.innerHTML = '<span class="loading"></span><span class="loading"></span><span class="loading"></span>';
    
    try {
        // Send message to backend
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message })
        });
        
        if (!response.ok) {
            // Try to parse JSON error, otherwise use status text
            let errorText = `Error ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorText = errorData.error || errorText;
            } catch (e) {
                // Not JSON, likely an HTML error page
            }
            throw new Error(errorText);
        }
        
        const data = await response.json();

        // Remove loading message
        if (loadingMsg && loadingMsg.parentNode === messagesContainer) {
            messagesContainer.removeChild(loadingMsg);
        }
        
        // Add AI response
        if (data.success) {
            addMessage(data.message, 'assistant');
        } else {
            throw new Error(data.error || 'Unknown error occurred');
        }
    } catch (error) {
        // Remove loading message
        if (loadingMsg && loadingMsg.parentNode === messagesContainer) {
            messagesContainer.removeChild(loadingMsg);
        }
        
        // Show error message
        errorMessage.textContent = `⚠️ ${error.message}`;
        errorMessage.classList.add('show');
        
        // Add error message to chat
        addMessage(`Sorry, I encountered an error: ${error.message}`, 'assistant');
    } finally {
        // Re-enable input and button
        userInput.disabled = false;
        sendBtn.disabled = false;
        userInput.focus();
    }
}

function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    // Create avatar
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    avatarDiv.textContent = sender === 'user' ? '👤' : '🤖';
    
    // Create message wrapper
    const wrapperDiv = document.createElement('div');
    wrapperDiv.className = 'message-wrapper';
    
    // Create message content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = text;
    
    wrapperDiv.appendChild(contentDiv);
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(wrapperDiv);
    
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return messageDiv;
}

// Check backend health on page load
window.addEventListener('load', async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        if (!response.ok) {
            throw new Error('Backend not responding');
        }
    } catch (error) {
        errorMessage.textContent = '⚠️ Backend server is not running. Please start the Flask server on port 5000.';
        errorMessage.classList.add('show');
    }
});
