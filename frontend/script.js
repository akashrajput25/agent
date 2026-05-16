// If the page is opened via file:// (origin === 'null'), default to the backend URL
const API_BASE_URL = (window.location.protocol === 'file:' || window.location.origin === 'null')
    ? 'http://localhost:5000'
    : ''; // Use relative paths when served via Flask

const messagesContainer = document.getElementById('messagesContainer');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const welcomeState = document.getElementById('welcomeState');
const modelBtn = document.getElementById('modelBtn');
const modelDisplay = document.getElementById('modelDisplay');
const modelDropdown = document.getElementById('modelDropdown');
const newChatBtn = document.getElementById('newChatBtn');
const errorMessage = document.getElementById('errorMessage');

// Auth Elements
const authOverlay = document.getElementById('authOverlay');
const authTitle = document.getElementById('authTitle');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const toggleAuthMode = document.getElementById('toggleAuthMode');
const authError = document.getElementById('authError');
const userNameDisplay = document.querySelector('.user-name');
const welcomeTitle = document.getElementById('welcomeTitle');
// Profile Edit Modal Elements
const editProfileBtn = document.getElementById('editProfileBtn'); // <--- ADDED THIS LINE
// Sidebar and Mobile Menu Elements
const menuToggle = document.getElementById('menuToggle'); // Declare menuToggle here
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
// Profile Edit Modal Elements
const profileEditOverlay = document.getElementById('profileEditOverlay');
const profileEditError = document.getElementById('profileEditError');
const editName = document.getElementById('editName');
const editEmail = document.getElementById('editEmail');
const editMobileNumber = document.getElementById('editMobileNumber');
const editAge = document.getElementById('editAge');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const cancelProfileEditBtn = document.getElementById('cancelProfileEditBtn'); // Added this line
const sidebar = document.querySelector('.sidebar');

let isLoginMode = true;
let currentUser = JSON.parse(localStorage.getItem('miku_user')) || null;

// Thread State Management
let conversations = {};
let currentThreadId = null;
const historyList = document.getElementById('historyList');

// Authentication Logic
toggleAuthMode.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    authTitle.textContent = isLoginMode ? 'Login to MIKU' : 'Register for MIKU';
    authSubmitBtn.textContent = isLoginMode ? 'Login' : 'Register';
    toggleAuthMode.textContent = isLoginMode ? 'Register here' : 'Login here';
});

authSubmitBtn.addEventListener('click', async () => {
    const email = authEmail.value;
    const password = authPassword.value;
    const endpoint = isLoginMode ? '/api/login' : '/api/register';

    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (data.success) {
            if (isLoginMode) {
                currentUser = data.user;
                localStorage.setItem('miku_user', JSON.stringify(currentUser));
                checkAuthState();
            } else {
                isLoginMode = true;
                authTitle.textContent = 'Login to MIKU';
                authError.textContent = 'Registration successful! Please login.';
                authError.style.display = 'block';
            }
        } else {
            authError.textContent = data.error;
            authError.style.display = 'block';
        }
    } catch (e) {
        authError.textContent = 'Connection error';
        authError.style.display = 'block';
    }
});

function checkAuthState() {
    if (currentUser) {
        authOverlay.style.display = 'none';
        userNameDisplay.textContent = currentUser.name;
        updateWelcomeMessage();
        conversations = JSON.parse(localStorage.getItem(`threads_${currentUser.email}`)) || {};
        initApp();
    } else {
        authOverlay.style.display = 'flex';
    }
}

function updateWelcomeMessage() {
    if (currentUser && welcomeTitle) {
        welcomeTitle.textContent = `Hi ${currentUser.name}! How can I help you today!`;
    }
}

function openProfileEditModal() {
    if (!currentUser) return;

    editName.value = currentUser.name || '';
    editEmail.value = currentUser.email || '';
    editMobileNumber.value = currentUser.mobileNumber || '';
    editAge.value = currentUser.age || '';
    profileEditError.textContent = ''; // Clear previous errors
    profileEditOverlay.classList.add('show-modal');
}

function closeProfileEditModal() {
    profileEditOverlay.classList.remove('show-modal');
    profileEditError.textContent = '';
}

async function saveProfileChanges() {
    if (!currentUser) return;

    const newName = editName.value.trim();
    const newMobileNumber = editMobileNumber.value.trim();
    const newAge = parseInt(editAge.value.trim(), 10);

    const updateData = {
        email: currentUser.email,
        name: newName,
        mobile_number: newMobileNumber || null, // Send null if empty
        age: isNaN(newAge) ? null : newAge // Send null if not a valid number
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/user/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        const data = await res.json();

        if (data.success) {
            // Update currentUser with all new data returned by the backend
            currentUser = { ...currentUser, ...data.user };
            localStorage.setItem('miku_user', JSON.stringify(currentUser));
            userNameDisplay.textContent = currentUser.name;
            updateWelcomeMessage();
            closeProfileEditModal();
        } else {
            profileEditError.textContent = data.error || 'Failed to update profile.';
        }
    } catch (e) {
        console.error('Failed to update profile:', e);
        profileEditError.textContent = 'Connection error or failed to reach server.';
    }
}

editProfileBtn?.addEventListener('click', async () => {
    openProfileEditModal();
});
saveProfileBtn?.addEventListener('click', saveProfileChanges);
cancelProfileEditBtn?.addEventListener('click', closeProfileEditModal);

menuToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('mobile-open');
});

closeSidebarBtn?.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
});

// Close sidebar when clicking main content on mobile
document.querySelector('.main-content')?.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
});

// Send message on button click
sendBtn.addEventListener('click', () => sendMessage());

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

// Toggle Model Dropdown
modelBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    modelDropdown?.classList.toggle('show');
    modelBtn?.classList.toggle('active');
});

// Handle Model Selection
document.querySelectorAll('.model-option').forEach(option => {
    option.addEventListener('click', () => {
        const selectedModel = option.getAttribute('data-model');
        // Update display and data attribute
        modelDisplay.textContent = option.textContent;
        modelBtn.setAttribute('data-selected-model', selectedModel);
        
        // Update selected state in dropdown
        document.querySelectorAll('.model-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        option.classList.add('selected');
        
        modelDropdown.classList.remove('show');
        modelBtn?.classList.remove('active');
    });
});

// Initialize default model on page load
window.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
});

function initApp() {
    const defaultModel = 'openrouter/free';
    const defaultOption = document.querySelector(`[data-model="${defaultModel}"]`);
    if (defaultOption) {
        defaultOption.classList.add('selected');
        modelBtn.setAttribute('data-selected-model', defaultModel);
        modelDisplay.textContent = defaultOption.textContent;
    }

    const threadIds = Object.keys(conversations);
    if (threadIds.length > 0) {
        loadThread(threadIds[threadIds.length - 1]);
    } else {
        createNewThread();
    }
}

function createNewThread() {
    const id = 'thread_' + Date.now();
    conversations[id] = {
        title: 'New Thread',
        messages: [],
        timestamp: Date.now()
    };
    if (currentUser) saveToStorage();
    loadThread(id);
}

function loadThread(id) {
    currentThreadId = id;
    messagesContainer.innerHTML = '';
    const thread = conversations[id];
    
    if (thread.messages.length === 0) {
        welcomeState.style.display = 'flex';
    } else {
        welcomeState.style.display = 'none';
        thread.messages.forEach(msg => {
            addMessage(msg.text, msg.sender, false);
        });
    }
    renderSidebar();
}

function deleteThread(id, event) {
    event.stopPropagation();
    delete conversations[id];
    saveToStorage();
    
    if (Object.keys(conversations).length === 0) {
        createNewThread();
    } else if (currentThreadId === id) {
        const threadIds = Object.keys(conversations);
        loadThread(threadIds[threadIds.length - 1]);
    } else {
        renderSidebar();
    }
}

function saveToStorage() {
    if (currentUser) localStorage.setItem(`threads_${currentUser.email}`, JSON.stringify(conversations));
}

function renderSidebar() {
    const label = historyList.querySelector('.nav-label');
    historyList.innerHTML = '';
    historyList.appendChild(label);

    // Sort threads by timestamp descending
    const sortedIds = Object.keys(conversations).sort((a, b) => 
        conversations[b].timestamp - conversations[a].timestamp
    );

    sortedIds.forEach(id => {
        const thread = conversations[id];
        const item = document.createElement('div');
        item.className = `history-item ${id === currentThreadId ? 'active' : ''}`;
        item.onclick = () => loadThread(id);

        const titleSpan = document.createElement('span');
        titleSpan.textContent = thread.title;

        const delBtn = document.createElement('button');
        delBtn.innerHTML = '✕';
        delBtn.className = 'delete-thread-btn';
        delBtn.onclick = (e) => deleteThread(id, e);

        item.appendChild(titleSpan);
        item.appendChild(delBtn);
        historyList.appendChild(item);
    });
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.model-selector-wrapper')) {
        modelDropdown?.classList.remove('show');
        modelBtn?.classList.remove('active');
    }
});

async function sendMessage(overrideMessage = null) {
    const message = (typeof overrideMessage === 'string') ? overrideMessage : userInput.value.trim();
    
    if (!message) return;

    // Hide welcome state (Greeting and Quick Actions) on the first message
    if (welcomeState && welcomeState.style.display !== 'none') {
        welcomeState.style.display = 'none';
    }
    
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
    loadingContent.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
    
    try {
        // Send message to backend
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                message: message,
                model: modelBtn.getAttribute('data-selected-model') || 'openrouter/free'
            })
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

function addMessage(text, sender, saveToState = true) {
    if (saveToState && currentThreadId) {
        const thread = conversations[currentThreadId];
        thread.messages.push({ text, sender });
        thread.timestamp = Date.now();
        if (sender === 'user' && thread.title === 'New Thread') {
            thread.title = text.length > 25 ? text.substring(0, 25) + '...' : text;
        }
        saveToStorage();
        renderSidebar();
    }

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

    if (sender === 'assistant' && text !== '') {
        // Use marked to parse markdown for assistant responses
        contentDiv.innerHTML = marked.parse(text);
        // Apply syntax highlighting to code blocks
        contentDiv.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    } else {
        contentDiv.textContent = text;
    }
    
    wrapperDiv.appendChild(contentDiv);
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(wrapperDiv);
    
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return messageDiv;
}

// Image upload functionality
const attachBtn = document.getElementById('attachBtn');
const imageInput = document.getElementById('imageInput');

if (attachBtn && imageInput) {
    attachBtn.addEventListener('click', () => {
        imageInput.click();
    });
    
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64Image = event.target.result;
                const message = userInput.value.trim() || 'Analyze this image';
                sendMessageWithImage(message, base64Image);
                imageInput.value = ''; // Reset file input
            };
            reader.readAsDataURL(file);
        }
    });
}

async function sendMessageWithImage(message, imageData) {
    if (!message) return;

    // Hide welcome state on first message
    if (welcomeState && welcomeState.style.display !== 'none') {
        welcomeState.style.display = 'none';
    }
    
    // Clear error message
    errorMessage.classList.remove('show');
    errorMessage.textContent = '';
    
    // Disable input and button
    userInput.disabled = true;
    sendBtn.disabled = true;
    attachBtn.disabled = true;
    
    // Add user message to chat
    addMessage(message, 'user');
    
    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';
    
    // Show loading indicator
    const loadingMsg = addMessage('', 'assistant');
    const loadingContent = loadingMsg.querySelector('.message-content');
    loadingContent.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
    
    try {
        // Send message with image to backend
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                message: message,
                model: modelBtn.getAttribute('data-selected-model') || 'openrouter/free',
                image: imageData
            })
        });
        
        if (!response.ok) {
            let errorText = `Error ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorText = errorData.error || errorText;
            } catch (e) {
                // Not JSON
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
        attachBtn.disabled = false;
        userInput.focus();
    }
}

// Handle quick action buttons
document.querySelectorAll('.quick-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const prompt = btn.getAttribute('data-prompt');
        sendMessage(prompt);
    });
});

// Reset Chat (New Thread)
if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
        createNewThread();
    });
}

// Check backend health on page load and initialize model
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

// Shooting Stars Background Logic
function createShootingStar() {
    const container = document.getElementById('starsContainer');
    if (!container) return;

    const star = document.createElement('div');
    star.className = 'shooting-star';
    
    // Designer RGB: Using HSL to get vibrant colors across the spectrum
    const hue = Math.floor(Math.random() * 360);
    const color = `hsl(${hue}, 80%, 70%)`;
    
    const startX = Math.random() * (window.innerWidth + 400);
    const duration = Math.random() * 2000 + 1500;
    const size = Math.random() * 100 + 150; // Length of the tail

    star.style.setProperty('--star-color', color);
    star.style.width = `${size}px`;
    star.style.left = `${startX}px`;
    star.style.top = `${Math.random() * -100}px`;
    star.style.animation = `shooting ${duration}ms ease-out forwards`;

    container.appendChild(star);
    setTimeout(() => star.remove(), duration);
}

// Initialize animations
setInterval(createShootingStar, 800);
