/**
 * API base URL:
 * - On Render/mobile: use relative URLs so calls go to the same origin as the deployed app.
 * - On local dev (localhost/127.0.0.1): call the Flask backend directly.
 */
const isLocalHost =
    window.location.host === 'localhost:5000' ||
    window.location.host === '127.0.0.1:5000' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

const API_BASE_URL =
    (window.location.protocol === 'file:' || window.location.origin === 'null' || isLocalHost)
        ? 'http://127.0.0.1:5000'
        : '';

const messagesContainer = document.getElementById('messagesContainer');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const welcomeState = document.getElementById('welcomeState');
const modelBtn = document.getElementById('modelBtn');
const modelDisplay = document.getElementById('modelDisplay');
const modelDropdown = document.getElementById('modelDropdown');
const newChatBtn = document.getElementById('newChatBtn');
const errorMessage = document.getElementById('errorMessage');
const assistantMode = document.getElementById('assistantMode');
const toneSelect = document.getElementById('toneSelect');
const lengthSelect = document.getElementById('lengthSelect');
const creativityRange = document.getElementById('creativityRange');
const assistantModeLabel = document.getElementById('assistantModeLabel');

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
const logoutBtn = document.getElementById('logoutBtn');
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
const userAvatarDisplay = document.querySelector('.user-avatar');
const avatarPreview = document.getElementById('avatarPreview');
const avatarGrid = document.getElementById('avatarGrid');
const exportThreadBtn = document.getElementById('exportThreadBtn');
const clearThreadsBtn = document.getElementById('clearThreadsBtn');
const threadSearchInput = document.getElementById('threadSearchInput');
const scrollLatestBtn = document.getElementById('scrollLatestBtn');
const inputCount = document.getElementById('inputCount');

// Autocomplete / Suggestions
const autocompleteContainer = document.getElementById('autocompleteContainer');
let autocompleteOpen = false;
let autocompleteItems = [];
let autocompleteIndex = 0;
let autocompleteLastQuery = '';

function escapeHtml(str) {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '<')
        .replaceAll('>', '>')
        .replaceAll('"', '"')
        .replaceAll("'", '&#039;');
}

function isAutocompleteTriggerContext() {
    const v = userInput?.value ?? '';
    const cursorPos = userInput?.selectionStart ?? v.length;
    const beforeCursor = v.slice(0, cursorPos);

    // Get the "current token" after last whitespace
    const match = beforeCursor.match(/(^|\s)([^\s]*)$/);
    const token = match ? match[2] : '';
    const hasWhitespaceBefore = match ? match[1].length > 0 : true;

    return { token, cursorPos, hasWhitespaceBefore };
}

function getSlashCommandSuggestions(prefix) {
    const commandMap = {
        '/summarize': 'Summarize this with key points, decisions, and action items',
        '/code': 'Senior engineer code help (reasoning + edge cases)',
        '/plan': 'Step-by-step practical plan with priorities',
        '/translate': 'Translate while preserving meaning, tone, and formatting',
        '/improve': 'Improve clarity, structure, tone, and impact',
        '/help': 'Show help and available commands',
        '/threads': 'List recent threads',
        '/clear': 'Clear saved chat threads',
        '/export': 'Export the current thread'
    };

    const p = (prefix || '').toLowerCase();
    return Object.keys(commandMap)
        .filter(cmd => cmd.toLowerCase().startsWith(p))
        .map(cmd => ({ id: cmd, label: cmd, meta: commandMap[cmd], insertText: cmd }));
}

function tokenizeForRecentSuggestions(text) {
    return String(text || '')
        .toLowerCase()
        .replaceAll(/[\r\n]+/g, ' ')
        .split(/\s+/)
        .map(t => t.trim())
        .filter(Boolean)
        .filter(t => t.length >= 3 && t.length <= 22);
}

function getRecentSuggestions(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) return [];

    // Build lightweight corpus from recent threads
    const ids = Object.keys(conversations || {}).slice(-10);
    const corpus = [];
    for (const id of ids) {
        const t = conversations[id];
        if (!t) continue;
        if (t.title) corpus.push(t.title);
        if (Array.isArray(t.messages)) {
            const recentMsgs = t.messages.slice(-6).map(m => m?.text).filter(Boolean);
            corpus.push(...recentMsgs);
        }
    }

    // Extract tokens and score by prefix match
    const freq = new Map();
    for (const item of corpus) {
        for (const tok of tokenizeForRecentSuggestions(item)) {
            freq.set(tok, (freq.get(tok) || 0) + 1);
        }
    }

    const scored = [...freq.entries()]
        .filter(([tok]) => tok.startsWith(q))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([tok]) => ({
            id: tok,
            label: tok,
            meta: 'From recent messages',
            insertText: tok
        }));

    return scored;
}

function buildAutocompleteItems(query) {
    const { token } = isAutocompleteTriggerContext();
    const current = token || '';

    // Slash command autocomplete
    if (current.startsWith('/')) {
        return getSlashCommandSuggestions(current).slice(0, 7);
    }

    // For normal text, show recent token suggestions only when query is "word-like"
    const trimmed = current.trim();
    if (!trimmed || trimmed.length < 3) return [];
    return getRecentSuggestions(trimmed).slice(0, 6);
}

function closeAutocomplete() {
    autocompleteOpen = false;
    autocompleteItems = [];
    autocompleteIndex = 0;
    autocompleteLastQuery = '';
    if (autocompleteContainer) {
        autocompleteContainer.innerHTML = '';
        autocompleteContainer.setAttribute('aria-expanded', 'false');
        autocompleteContainer.style.display = 'none';
    }
}

function renderAutocomplete() {
    if (!autocompleteContainer) return;

    autocompleteContainer.innerHTML = '';
    if (!autocompleteItems.length) {
        closeAutocomplete();
        return;
    }

    autocompleteContainer.style.display = 'block';
    autocompleteContainer.setAttribute('aria-expanded', 'true');

    autocompleteItems.forEach((item, idx) => {
        const el = document.createElement('div');
        el.className = `autocomplete-item ${idx === autocompleteIndex ? 'active' : ''}`;
        el.setAttribute('role', 'option');
        el.setAttribute('aria-selected', idx === autocompleteIndex ? 'true' : 'false');
        el.dataset.index = String(idx);

        el.innerHTML = `
            <div class="autocomplete-main">${escapeHtml(item.label)}</div>
            <div class="autocomplete-sub">${escapeHtml(item.meta || '')}</div>
        `;

        el.addEventListener('mousedown', (e) => {
            // prevent textarea blur
            e.preventDefault();
        });

        el.addEventListener('click', () => {
            acceptAutocompleteSelection();
        });

        autocompleteContainer.appendChild(el);
    });
}

function openAutocompleteIfNeeded() {
    if (!autocompleteContainer) return;

    const { token } = isAutocompleteTriggerContext();
    const q = token || '';
    autocompleteLastQuery = q;

    const nextItems = buildAutocompleteItems(q);
    const shouldOpen = nextItems.length > 0;

    if (!shouldOpen) {
        closeAutocomplete();
        return;
    }

    autocompleteItems = nextItems;
    autocompleteIndex = 0;
    autocompleteOpen = true;
    renderAutocomplete();
}

function acceptAutocompleteSelection() {
    if (!autocompleteOpen || !autocompleteItems.length) return;

    const item = autocompleteItems[autocompleteIndex] || autocompleteItems[0];
    if (!item) return;

    // Replace the "current token" with item.insertText
    const v = userInput.value;
    const cursorPos = userInput.selectionStart;
    const beforeCursor = v.slice(0, cursorPos);
    const afterCursor = v.slice(cursorPos);

    const match = beforeCursor.match(/(^|\s)([^\s]*)$/);
    if (!match) {
        userInput.value = `${v}${v && !v.endsWith(' ') ? ' ' : ''}${item.insertText}`;
    } else {
        const leading = beforeCursor.slice(0, beforeCursor.length - (match[2]?.length ?? 0));
        const separator = match[1].length ? match[1] : '';
        const newBeforeCursor = `${leading}${separator}${item.insertText}`;
        userInput.value = `${newBeforeCursor}${afterCursor}`;
    }

    closeAutocomplete();
    userInput.focus();
    userInput.dispatchEvent(new Event('input'));
}

function moveAutocompleteSelection(delta) {
    if (!autocompleteOpen || !autocompleteItems.length) return;
    autocompleteIndex = (autocompleteIndex + delta + autocompleteItems.length) % autocompleteItems.length;
    renderAutocomplete();
}

// Show autocomplete on input changes
userInput.addEventListener('input', () => {
    // Let slash command suggestions react immediately; avoid when disabled/auth overlay
    if (userInput.disabled) return;

    openAutocompleteIfNeeded();
});

// Close autocomplete on blur / external clicks
document.addEventListener('click', (e) => {
    if (!autocompleteContainer) return;
    if (!e.target.closest('#autocompleteContainer') && !e.target.closest('#userInput')) {
        closeAutocomplete();
    }
});

userInput.addEventListener('keydown', (e) => {
    if (!autocompleteContainer) return;

    if (e.key === 'Escape') {
        if (autocompleteOpen) {
            e.preventDefault();
            closeAutocomplete();
        }
        return;
    }

    if (!autocompleteOpen) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveAutocompleteSelection(1);
        return;
    }
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveAutocompleteSelection(-1);
        return;
    }

    // Tab accepts suggestion. Enter accepts suggestion ONLY when dropdown open.
    if (e.key === 'Tab') {
        e.preventDefault();
        acceptAutocompleteSelection();
        return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        acceptAutocompleteSelection();
        return;
    }
});

let isLoginMode = true;
let currentUser = JSON.parse(localStorage.getItem('miku_user')) || null;
const savedAssistantOptions = JSON.parse(localStorage.getItem('miku_assistant_options')) || {};
let selectedAvatarId = currentUser?.avatarId || 'male-1';
let threadSearchQuery = '';

const assistantModeNames = {
    balanced: 'Balanced assistant',
    coder: 'Code expert',
    teacher: 'Tutor mode',
    researcher: 'Research mode',
    creative: 'Creative partner',
    productivity: 'Productivity coach'
};

const profileAvatars = [
    { id: 'female-1', gender: 'Female', name: 'Astra', hair: '#2F1D3D', skin: '#F1C7A8', accent: '#FF7AB6', hairStyle: 'bob', accessory: 'headband' },
    { id: 'female-2', gender: 'Female', name: 'Nova', hair: '#1C2A44', skin: '#DCA987', accent: '#61D6FF', hairStyle: 'side-sweep', accessory: 'glasses' },
    { id: 'female-3', gender: 'Female', name: 'Mira', hair: '#5A3426', skin: '#F0BFA1', accent: '#A3FFCB', hairStyle: 'long-wave', accessory: 'earrings' },
    { id: 'female-4', gender: 'Female', name: 'Iris', hair: '#151515', skin: '#B8795F', accent: '#B99CFF', hairStyle: 'bun', accessory: 'bindi' },
    { id: 'female-5', gender: 'Female', name: 'Zara', hair: '#7B2D45', skin: '#8F5D48', accent: '#FFD166', hairStyle: 'curls', accessory: 'clips' },
    { id: 'male-1', gender: 'Male', name: 'Kai', hair: '#1B1B1B', skin: '#D9A47F', accent: '#10A37F', hairStyle: 'quiff', facialHair: 'stubble' },
    { id: 'male-2', gender: 'Male', name: 'Orion', hair: '#3C2A1E', skin: '#E8B994', accent: '#61D6FF', hairStyle: 'side-part', facialHair: 'moustache' },
    { id: 'male-3', gender: 'Male', name: 'Leo', hair: '#111827', skin: '#9D6B52', accent: '#A3FFCB', hairStyle: 'buzz', facialHair: 'full-beard' },
    { id: 'male-4', gender: 'Male', name: 'Rey', hair: '#5E4635', skin: '#F1C7A8', accent: '#FF7AB6', hairStyle: 'curly-top', facialHair: 'goatee', accessory: 'glasses' },
    { id: 'male-5', gender: 'Male', name: 'Arin', hair: '#263238', skin: '#7A4E3B', accent: '#FFD166', hairStyle: 'long-tied', facialHair: 'beard-moustache' }
];

// Thread State Management
let conversations = {};
let currentThreadId = null;
const historyList = document.getElementById('historyList');

// Authentication Logic
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateAuthFields() {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    let error = '';

    if (!email) {
        error = 'Email is required.';
    } else if (!emailRegex.test(email)) {
        error = 'Enter a valid email address.';
    } else if (!password) {
        error = 'Password is required.';
    } else if (password.length < 6) {
        error = 'Password must be at least 6 characters.';
    }

    if (error) {
        authError.textContent = error;
        authError.style.display = 'block';
        authSubmitBtn.disabled = true;
        return false;
    }

    authError.textContent = '';
    authError.style.display = 'none';
    authSubmitBtn.disabled = false;
    return true;
}

authEmail.addEventListener('input', validateAuthFields);
authPassword.addEventListener('input', validateAuthFields);

toggleAuthMode.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    authTitle.textContent = isLoginMode ? 'Login to MIKU' : 'Register for MIKU';
    authSubmitBtn.textContent = isLoginMode ? 'Login' : 'Register';
    toggleAuthMode.textContent = isLoginMode ? 'Register here' : 'Login here';
    validateAuthFields();
});

authSubmitBtn.addEventListener('click', async () => {
    if (!validateAuthFields()) {
        return;
    }

    const email = authEmail.value.trim();
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
        selectedAvatarId = currentUser.avatarId || 'male-1';
        updateAvatarDisplays();
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

function getAvatarById(id) {
    return profileAvatars.find(avatar => avatar.id === id) || profileAvatars[5];
}

function createAvatarSvg(avatar, size = 64) {
    const hairStyles = {
        'bob': `
            <path d="M17 26c0-10 6-16 15-16s15 6 15 16v14c-4 4-8 6-15 6s-11-2-15-6V26z" fill="${avatar.hair}"/>
            <path d="M19 25c6-7 15-10 26-3" stroke="rgba(255,255,255,.18)" stroke-width="2.2" stroke-linecap="round"/>
        `,
        'side-sweep': `
            <path d="M16 30c1-13 8-20 19-18c8 1 13 7 13 17c-8-6-19-8-32 1z" fill="${avatar.hair}"/>
            <path d="M19 25c9-9 20-10 28-2" stroke="rgba(255,255,255,.2)" stroke-width="2.4" stroke-linecap="round"/>
        `,
        'long-wave': `
            <path d="M15 25c0-10 7-16 17-16s17 6 17 16v28c-5 3-10 3-15 0c-5 3-11 3-18 0V25z" fill="${avatar.hair}"/>
            <path d="M18 35c5-4 7-11 5-19M43 35c-5-4-7-11-5-19" stroke="rgba(255,255,255,.18)" stroke-width="2" stroke-linecap="round"/>
        `,
        'bun': `
            <circle cx="32" cy="12" r="7" fill="${avatar.hair}"/>
            <path d="M17 27c1-11 7-17 15-17s14 6 15 17c-7-3-23-3-30 0z" fill="${avatar.hair}"/>
            <path d="M23 18c5 4 13 4 18 0" stroke="rgba(255,255,255,.18)" stroke-width="2" stroke-linecap="round"/>
        `,
        'curls': `
            <path d="M15 27c0-10 7-17 17-17s17 7 17 17v18c-4 3-8 4-13 3c3-4 1-8-4-8s-7 4-4 8c-5 1-9 0-13-3V27z" fill="${avatar.hair}"/>
            <circle cx="20" cy="24" r="5" fill="${avatar.hair}"/><circle cx="28" cy="17" r="5" fill="${avatar.hair}"/><circle cx="39" cy="20" r="5" fill="${avatar.hair}"/><circle cx="45" cy="29" r="5" fill="${avatar.hair}"/>
        `,
        'quiff': `
            <path d="M17 25c1-9 7-15 15-15c6 0 10 2 14 7c-9-2-16 0-24 7c7-1 14-1 25 3c-6-8-21-8-30-2z" fill="${avatar.hair}"/>
            <path d="M23 20c4-7 11-9 20-4" stroke="rgba(255,255,255,.22)" stroke-width="2.3" stroke-linecap="round"/>
        `,
        'side-part': `
            <path d="M17 24c2-9 8-14 16-14s13 5 15 14c-8-4-17-5-31 0z" fill="${avatar.hair}"/>
            <path d="M31 13c-2 5-7 8-13 10" stroke="rgba(255,255,255,.24)" stroke-width="2" stroke-linecap="round"/>
        `,
        'buzz': `
            <path d="M18 24c2-8 7-12 14-12s12 4 14 12c-8-3-20-3-28 0z" fill="${avatar.hair}"/>
            <path d="M20 21c6-3 18-3 24 0" stroke="rgba(255,255,255,.16)" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="2 3"/>
        `,
        'curly-top': `
            <path d="M17 26c0-9 6-15 15-15s15 6 15 15c-8-5-22-5-30 0z" fill="${avatar.hair}"/>
            <circle cx="22" cy="20" r="4" fill="${avatar.hair}"/><circle cx="29" cy="16" r="4" fill="${avatar.hair}"/><circle cx="37" cy="17" r="4" fill="${avatar.hair}"/><circle cx="44" cy="22" r="4" fill="${avatar.hair}"/>
        `,
        'long-tied': `
            <path d="M16 25c1-10 7-16 16-16s15 6 16 16v21c-5 5-27 5-32 0V25z" fill="${avatar.hair}"/>
            <path d="M39 42c5 4 8 8 8 13" stroke="${avatar.hair}" stroke-width="5" stroke-linecap="round"/>
            <path d="M18 26c7-7 17-11 29-2" stroke="rgba(255,255,255,.18)" stroke-width="2.2" stroke-linecap="round"/>
        `
    };
    const facialHairStyles = {
        'stubble': `<path d="M23 37c5 5 13 5 18 0" stroke="${avatar.hair}" stroke-opacity=".45" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 4"/>`,
        'moustache': `<path d="M24 35c3-3 6-3 8 0c2-3 5-3 8 0" stroke="${avatar.hair}" stroke-width="3" stroke-linecap="round"/>`,
        'full-beard': `<path d="M20 35c2 12 8 16 12 16s10-4 12-16c-6 5-18 5-24 0z" fill="${avatar.hair}" fill-opacity=".78"/><path d="M27 37c2 2 8 2 10 0" stroke="${avatar.skin}" stroke-width="2" stroke-linecap="round"/>`,
        'goatee': `<path d="M28 40c1 5 7 5 8 0c-2 1-6 1-8 0z" fill="${avatar.hair}"/><path d="M25 35c2-2 5-2 7 0c2-2 5-2 7 0" stroke="${avatar.hair}" stroke-width="2.4" stroke-linecap="round"/>`,
        'beard-moustache': `<path d="M23 35c3-3 6-3 9 0c3-3 6-3 9 0" stroke="${avatar.hair}" stroke-width="3" stroke-linecap="round"/><path d="M21 38c3 9 8 13 11 13s8-4 11-13c-7 4-15 4-22 0z" fill="${avatar.hair}" fill-opacity=".72"/>`
    };
    const accessories = {
        'headband': `<path d="M18 23c8-6 20-6 28 0" stroke="${avatar.accent}" stroke-width="3" stroke-linecap="round"/>`,
        'glasses': `<path d="M22 30h8M34 30h8M30 30h4" stroke="#172026" stroke-width="1.6" stroke-linecap="round"/><rect x="21" y="27" width="9" height="7" rx="3" stroke="#172026" stroke-width="1.5"/><rect x="34" y="27" width="9" height="7" rx="3" stroke="#172026" stroke-width="1.5"/>`,
        'earrings': `<circle cx="18" cy="35" r="2" fill="${avatar.accent}"/><circle cx="46" cy="35" r="2" fill="${avatar.accent}"/>`,
        'bindi': `<circle cx="32" cy="25" r="1.6" fill="${avatar.accent}"/>`,
        'clips': `<path d="M20 22l5 2M44 22l-5 2" stroke="${avatar.accent}" stroke-width="2.2" stroke-linecap="round"/>`
    };
    const hairMarkup = hairStyles[avatar.hairStyle] || hairStyles.quiff;
    const facialHairMarkup = avatar.facialHair ? facialHairStyles[avatar.facialHair] || '' : '';
    const accessoryMarkup = avatar.accessory ? accessories[avatar.accessory] || '' : '';

    return `
        <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect width="64" height="64" rx="20" fill="${avatar.accent}" fill-opacity=".16"/>
            <circle cx="32" cy="32" r="27" fill="${avatar.accent}" fill-opacity=".12" stroke="${avatar.accent}" stroke-opacity=".5"/>
            ${hairMarkup}
            <circle cx="32" cy="31" r="14" fill="${avatar.skin}"/>
            <path d="M18 59c2-10 8-16 14-16s12 6 14 16H18z" fill="${avatar.accent}"/>
            <circle cx="27" cy="30" r="1.7" fill="#172026"/>
            <circle cx="37" cy="30" r="1.7" fill="#172026"/>
            ${accessoryMarkup}
            ${facialHairMarkup}
            <path d="M28 38c2.2 1.8 5.8 1.8 8 0" stroke="#172026" stroke-width="2" stroke-linecap="round"/>
            <circle cx="49" cy="49" r="6" fill="#0B0D10" stroke="${avatar.accent}" stroke-width="2"/>
            <path d="M46.5 49h5M49 46.5v5" stroke="${avatar.accent}" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
    `;
}

function getCurrentAvatarMarkup(size = 64) {
    return createAvatarSvg(getAvatarById(currentUser?.avatarId || selectedAvatarId), size);
}

function updateAvatarDisplays() {
    if (userAvatarDisplay) {
        userAvatarDisplay.innerHTML = currentUser ? getCurrentAvatarMarkup(40) : '👤';
    }
    if (avatarPreview) {
        avatarPreview.innerHTML = createAvatarSvg(getAvatarById(selectedAvatarId), 72);
    }
}

function renderAvatarGrid() {
    if (!avatarGrid) return;

    avatarGrid.innerHTML = '';
    profileAvatars.forEach(avatar => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `avatar-choice ${avatar.id === selectedAvatarId ? 'selected' : ''}`;
        button.setAttribute('role', 'radio');
        button.setAttribute('aria-checked', avatar.id === selectedAvatarId ? 'true' : 'false');
        button.title = `${avatar.name} (${avatar.gender})`;
        button.innerHTML = `${createAvatarSvg(avatar, 52)}<span>${avatar.name}</span>`;
        button.addEventListener('click', () => {
            selectedAvatarId = avatar.id;
            renderAvatarGrid();
            updateAvatarDisplays();
        });
        avatarGrid.appendChild(button);
    });
}

function openProfileEditModal() {
    if (!currentUser) return;

    selectedAvatarId = currentUser.avatarId || 'male-1';
    editName.value = currentUser.name || '';
    editEmail.value = currentUser.email || '';
    editMobileNumber.value = currentUser.mobileNumber || '';
    editAge.value = currentUser.age || '';
    renderAvatarGrid();
    updateAvatarDisplays();
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
        age: isNaN(newAge) ? null : newAge, // Send null if not a valid number
        avatar_id: selectedAvatarId
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
            selectedAvatarId = currentUser.avatarId || selectedAvatarId;
            updateAvatarDisplays();
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

threadSearchInput?.addEventListener('input', (e) => {
    threadSearchQuery = e.target.value;
    renderSidebar();
});

logoutBtn?.addEventListener('click', () => {
    // Clear user session locally and show auth overlay
    if (currentUser) {
        localStorage.removeItem('miku_user');
        currentUser = null;
        // Optionally clear user threads from storage
        // localStorage.removeItem(`threads_${currentUser?.email}`);
        authOverlay.style.display = 'flex';
        userNameDisplay.textContent = 'Guest User';
        if (userAvatarDisplay) userAvatarDisplay.textContent = '👤';
        conversations = {};
        currentThreadId = null;
        messagesContainer.innerHTML = '';
        renderSidebar();
        createNewThread();
    }
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
    updateInputCount();
});

function updateInputCount() {
    if (!inputCount) return;
    const count = userInput.value.length;
    inputCount.textContent = `${count} ${count === 1 ? 'character' : 'characters'}`;
}

function getAssistantOptions() {
    return {
        mode: assistantMode?.value || 'balanced',
        tone: toneSelect?.value || 'friendly',
        length: lengthSelect?.value || 'normal',
        creativity: Number(creativityRange?.value || 55)
    };
}

function saveAssistantOptions() {
    const options = getAssistantOptions();
    localStorage.setItem('miku_assistant_options', JSON.stringify(options));
    if (assistantModeLabel) {
        assistantModeLabel.textContent = assistantModeNames[options.mode] || 'Balanced assistant';
    }
}

function restoreAssistantOptions() {
    if (assistantMode && savedAssistantOptions.mode) assistantMode.value = savedAssistantOptions.mode;
    if (toneSelect && savedAssistantOptions.tone) toneSelect.value = savedAssistantOptions.tone;
    if (lengthSelect && savedAssistantOptions.length) lengthSelect.value = savedAssistantOptions.length;
    if (creativityRange && savedAssistantOptions.creativity !== undefined) creativityRange.value = savedAssistantOptions.creativity;
    saveAssistantOptions();
}

[assistantMode, toneSelect, lengthSelect, creativityRange].forEach(control => {
    control?.addEventListener('change', saveAssistantOptions);
    control?.addEventListener('input', saveAssistantOptions);
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
    validateAuthFields();
    restoreAssistantOptions();
    updateInputCount();
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
    // If user is currently searching threads, clear the filter so the newly created
    // thread is guaranteed to appear and match the active highlight.
    if (threadSearchQuery && threadSearchInput) {
        threadSearchQuery = '';
        threadSearchInput.value = '';
    }

    const id = 'thread_' + Date.now();

    conversations[id] = {
        title: 'New Thread',
        messages: [],
        timestamp: Date.now(),
        pinned: false
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
    updateScrollLatestButton();
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

function togglePinThread(id, event) {
    event.stopPropagation();
    if (!conversations[id]) return;
    conversations[id].pinned = !conversations[id].pinned;
    conversations[id].timestamp = Date.now();
    saveToStorage();
    renderSidebar();
}

function renameThread(id, event) {
    event.stopPropagation();
    const thread = conversations[id];
    if (!thread) return;

    const nextTitle = window.prompt('Rename thread', thread.title || 'New Thread');
    if (nextTitle === null) return;

    const cleanTitle = nextTitle.trim();
    if (!cleanTitle) return;

    thread.title = cleanTitle.slice(0, 80);
    thread.timestamp = Date.now();
    saveToStorage();
    renderSidebar();
}

function saveToStorage() {
    if (currentUser) localStorage.setItem(`threads_${currentUser.email}`, JSON.stringify(conversations));
}

function renderSidebar() {
    const label = historyList.querySelector('.nav-label');
    historyList.innerHTML = '';
    historyList.appendChild(label);

    const normalizedQuery = threadSearchQuery.trim().toLowerCase();
    const sortedIds = Object.keys(conversations)
        .filter(id => {
            if (!normalizedQuery) return true;
            const thread = conversations[id];
            const searchable = [
                thread.title,
                ...(thread.messages || []).map(msg => msg.text)
            ].join(' ').toLowerCase();
            return searchable.includes(normalizedQuery);
        })
        .sort((a, b) => {
            const pinnedDelta = Number(!!conversations[b].pinned) - Number(!!conversations[a].pinned);
            if (pinnedDelta !== 0) return pinnedDelta;
            return conversations[b].timestamp - conversations[a].timestamp;
        });

    if (sortedIds.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-history';
        empty.textContent = 'No matching threads';
        historyList.appendChild(empty);
        return;
    }

    sortedIds.forEach(id => {
        const thread = conversations[id];
        const item = document.createElement('div');
        item.className = `history-item ${id === currentThreadId ? 'active' : ''} ${thread.pinned ? 'pinned' : ''}`;
        item.onclick = () => loadThread(id);

        const titleSpan = document.createElement('span');
        titleSpan.textContent = `${thread.pinned ? '★ ' : ''}${thread.title}`;

        const pinBtn = document.createElement('button');
        pinBtn.textContent = thread.pinned ? '★' : '☆';
        pinBtn.className = 'thread-action-btn';
        pinBtn.title = thread.pinned ? 'Unpin thread' : 'Pin thread';
        pinBtn.onclick = (e) => togglePinThread(id, e);

        const renameBtn = document.createElement('button');
        renameBtn.textContent = '✎';
        renameBtn.className = 'thread-action-btn';
        renameBtn.title = 'Rename thread';
        renameBtn.onclick = (e) => renameThread(id, e);

        const delBtn = document.createElement('button');
        delBtn.innerHTML = '✕';
        delBtn.className = 'delete-thread-btn';
        delBtn.title = 'Delete thread';
        delBtn.onclick = (e) => deleteThread(id, e);

        item.appendChild(titleSpan);
        item.appendChild(pinBtn);
        item.appendChild(renameBtn);
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

function expandSlashCommand(message) {
    const commandMap = {
        '/summarize': 'Summarize this clearly with key points, decisions, and action items:',
        '/code': 'Help me solve this as a senior software engineer. Include code, reasoning, and edge cases:',
        '/plan': 'Turn this into a practical step-by-step plan with priorities and next actions:',
        '/translate': 'Translate this and preserve the meaning, tone, and formatting:',
        '/improve': 'Improve this for clarity, structure, tone, and impact:'
    };

    const trimmed = (message || '').trim();
    const lowered = trimmed.toLowerCase();

    // Built-in helper
    if (lowered === '/help') {
        return getHelpText();
    }

    // Basic slash commands handled client-side
    if (lowered.startsWith('/threads')) {
        return getThreadsText();
    }

    if (lowered.startsWith('/clear')) {
        return '__MIKU_CLEAR__';
    }

    if (lowered.startsWith('/export')) {
        return '__MIKU_EXPORT__';
    }

    const command = Object.keys(commandMap).find(key => lowered.startsWith(key));
    if (!command) return message;

    const rest = trimmed.slice(command.length).trim();
    return `${commandMap[command]}\n\n${rest || 'Ask me for the content if I have not provided it yet.'}`;
}

function getHelpText() {
    return [
        'MIKU Help',
        '',
        'Slash commands:',
        '- /help : show this help',
        '- /threads : list recent threads',
        '- /export : export the current thread',
        '- /clear : clear all saved chat threads for this account',
        '',
        'Prompt shortcuts:',
        '- /summarize <text>',
        '- /code <task>',
        '- /plan <goal>',
        '- /translate <text>',
        '- /improve <text>',
        '',
        'Tip: You can mix these with normal chat messages.'
    ].join('\n');
}

function getThreadsText() {
    const ids = Object.keys(conversations || {});
    if (!ids.length) return 'No threads yet. Use “New Thread” to start.';

    const sortedIds = ids
        .map(id => ({ id, t: conversations[id]?.timestamp || 0, pinned: !!conversations[id]?.pinned }))
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.t - a.t))
        .slice(0, 10);

    const lines = sortedIds.map((x, idx) => {
        const thread = conversations[x.id];
        const title = thread?.title || 'Untitled';
        return `${idx + 1}. ${x.pinned ? '★ ' : ''}${title}`;
    });

    return ['Recent Threads:', ...lines, '', 'Use the sidebar to open a thread.'].join('\n');
}


async function sendMessage(overrideMessage = null, options = {}) {
    const rawMessage = (typeof overrideMessage === 'string') ? overrideMessage : userInput.value.trim();
    const message = expandSlashCommand(rawMessage);
    const shouldAddUserMessage = options.addUserMessage !== false;
    
    if (!rawMessage) return;

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
    if (shouldAddUserMessage) {
        addMessage(rawMessage, 'user');
    }
    
    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';
    updateInputCount();
    
    // Show loading indicator
    const loadingMsg = addMessage('', 'assistant', false);
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
                model: modelBtn.getAttribute('data-selected-model') || 'openrouter/free',
                assistantOptions: getAssistantOptions()
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
    if (sender === 'user' && currentUser) {
        avatarDiv.innerHTML = getCurrentAvatarMarkup(32);
    } else {
        avatarDiv.textContent = sender === 'user' ? '👤' : '🤖';
    }
    
    // Create message wrapper
    const wrapperDiv = document.createElement('div');
    wrapperDiv.className = 'message-wrapper';
    
    // Create message content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (sender === 'assistant' && text !== '') {
        // Convert bare image URLs into markdown images so they render inline
        const textWithImages = text.replace(/(https?:\/\/\S+\.(?:png|jpe?g|gif|webp|svg))/gi, '![]($1)');
        contentDiv.innerHTML = marked.parse(textWithImages);
        // Apply syntax highlighting to code blocks
        contentDiv.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    } else {
        contentDiv.textContent = text;
    }
    
    wrapperDiv.appendChild(contentDiv);

    if (sender === 'assistant' && text !== '') {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'message-action-btn';
        copyBtn.type = 'button';
        copyBtn.textContent = 'Copy';
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(text);
                copyBtn.textContent = 'Copied';
                setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1200);
            } catch (error) {
                copyBtn.textContent = 'Failed';
                setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1200);
            }
        });

        const retryBtn = document.createElement('button');
        retryBtn.className = 'message-action-btn';
        retryBtn.type = 'button';
        retryBtn.textContent = 'Retry';
        retryBtn.addEventListener('click', () => regenerateLastAssistantReply());

        actionsDiv.appendChild(copyBtn);
        actionsDiv.appendChild(retryBtn);
        wrapperDiv.appendChild(actionsDiv);
    }
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(wrapperDiv);
    
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    updateScrollLatestButton();
    
    return messageDiv;
}

function regenerateLastAssistantReply() {
    if (!currentThreadId) return;
    const thread = conversations[currentThreadId];
    if (!thread || thread.messages.length === 0) return;

    const lastUserMessage = [...thread.messages].reverse().find(msg => msg.sender === 'user');
    if (!lastUserMessage) return;

    for (let i = thread.messages.length - 1; i >= 0; i--) {
        if (thread.messages[i].sender === 'assistant') {
            thread.messages.splice(i, 1);
            break;
        }
    }
    saveToStorage();
    loadThread(currentThreadId);
    sendMessage(lastUserMessage.text, { addUserMessage: false });
}

function updateScrollLatestButton() {
    if (!scrollLatestBtn) return;
    const distanceFromBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight;
    scrollLatestBtn.classList.toggle('show', distanceFromBottom > 180);
}

messagesContainer?.addEventListener('scroll', updateScrollLatestButton);

scrollLatestBtn?.addEventListener('click', () => {
    messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' });
});

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
    updateInputCount();
    
    // Show loading indicator
    const loadingMsg = addMessage('', 'assistant', false);
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
                image: imageData,
                assistantOptions: getAssistantOptions()
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

document.querySelectorAll('.prompt-chip').forEach(btn => {
    btn.addEventListener('click', () => {
        const insert = btn.getAttribute('data-insert') || '';
        const separator = userInput.value && !userInput.value.endsWith(' ') ? ' ' : '';
        userInput.value = `${userInput.value}${separator}${insert}`;
        userInput.focus();
        userInput.dispatchEvent(new Event('input'));
    });
});

function exportCurrentThread() {
    if (!currentThreadId || !conversations[currentThreadId]) {
        return;
    }

    const thread = conversations[currentThreadId];
    const lines = [
        `MIKU Chat Export`,
        `Title: ${thread.title}`,
        `Exported: ${new Date().toLocaleString()}`,
        '',
        ...thread.messages.map(msg => `${msg.sender.toUpperCase()}:\n${msg.text}`)
    ];
    const blob = new Blob([lines.join('\n\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${thread.title.replace(/[^\w-]+/g, '_').slice(0, 40) || 'miku-chat'}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function clearAllThreads() {
    if (!currentUser) return;
    const confirmed = window.confirm('Clear all saved chat threads for this account?');
    if (!confirmed) return;

    conversations = {};
    localStorage.removeItem(`threads_${currentUser.email}`);
    messagesContainer.innerHTML = '';
    createNewThread();
}

// Reset Chat (New Thread)
if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
        // If user is searching, reset filter so the new thread shows immediately.
        if (threadSearchQuery && threadSearchInput) {
            threadSearchQuery = '';
            threadSearchInput.value = '';
        }
        createNewThread();
    });
}


exportThreadBtn?.addEventListener('click', exportCurrentThread);
clearThreadsBtn?.addEventListener('click', clearAllThreads);

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

