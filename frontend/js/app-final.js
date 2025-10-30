// API base URL
const API_BASE = '/api';

// Current user state
let currentUser = null;

console.log('🚀 CodeTrain Frontend Initialized');

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 DOM loaded, setting up event listeners');
    checkAuthStatus();
    setupEventListeners();
});

// Check if user is already logged in
async function checkAuthStatus() {
    console.log('🔍 Checking authentication status...');
    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            credentials: 'include'
        });
        
        console.log('🔍 Auth check response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('🔍 User data:', data);
            currentUser = data.user;
            showUserInfo();
        } else {
            console.log('🔍 Not authenticated');
            showAuthForms();
        }
    } catch (error) {
        console.error('🔍 Auth check failed:', error);
        showAuthForms();
    }
}

// Event Listeners
function setupEventListeners() {
    console.log('🔍 Setting up event listeners');
    
    // Auth buttons
    document.getElementById('login-btn').addEventListener('click', () => {
        console.log('🔍 Login button clicked');
        showForm('login');
    });
    
    document.getElementById('register-btn').addEventListener('click', () => {
        console.log('🔍 Register button clicked');
        showForm('register');
    });
    
    // Form switches
    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        showForm('register');
    });
    
    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        showForm('login');
    });
    
    // Form submissions
    document.getElementById('do-login').addEventListener('click', handleLogin);
    document.getElementById('do-register').addEventListener('click', handleRegister);
    
    // User actions
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // START TRAINING BUTTON - FIXED
    const startTrainingBtn = document.getElementById('start-training-btn');
    if (startTrainingBtn) {
        console.log('🔍 Start Training button found, adding event listener');
        startTrainingBtn.addEventListener('click', function() {
            console.log('🔍 Start Training button clicked!');
            window.location.href = '/learning-platform.html';
        });
    } else {
        console.error('❌ Start Training button not found!');
    }
    
    // Enter key support
    document.getElementById('login-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    document.getElementById('register-confirm').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleRegister();
    });
}

// Start Training function - SIMPLE AND RELIABLE
function startTraining() {
    console.log('🔍 Start Training function called');
    window.location.href = '/learning-platform.html';
}

// Authentication functions
async function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    console.log('🔍 Login attempt:', username);
    
    if (!username || !password) {
        alert('Please enter both username and password');
        return;
    }
    
    const result = await loginUser(username, password);
    if (result.success) {
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        alert('Login successful! Click "Start Training" to begin learning.');
    } else {
        alert('Login failed: ' + result.error);
    }
}

async function handleRegister() {
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    
    console.log('🔍 Register attempt:', username);
    
    if (!username || !email || !password || !confirm) {
        alert('Please fill in all fields');
        return;
    }
    
    if (password !== confirm) {
        alert('Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    const result = await registerUser({ username, email, password });
    if (result.success) {
        document.getElementById('register-username').value = '';
        document.getElementById('register-email').value = '';
        document.getElementById('register-password').value = '';
        document.getElementById('register-confirm').value = '';
        alert('Account created successfully! Click "Start Training" to begin learning.');
    } else {
        alert('Registration failed: ' + result.error);
    }
}

async function loginUser(username, password) {
    try {
        console.log('🔍 Sending login request...');
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });

        console.log('🔍 Login response status:', response.status);
        const data = await response.json();
        console.log('🔍 Login response data:', data);
        
        if (response.ok) {
            currentUser = data.user;
            showUserInfo();
            return { success: true };
        } else {
            return { success: false, error: data.error };
        }
    } catch (error) {
        console.error('🔍 Login error:', error);
        return { success: false, error: 'Network error - cannot connect to server' };
    }
}

async function registerUser(userData) {
    try {
        console.log('🔍 Sending register request...');
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(userData)
        });

        console.log('🔍 Register response status:', response.status);
        const data = await response.json();
        console.log('🔍 Register response data:', data);
        
        if (response.ok) {
            currentUser = data.user;
            showUserInfo();
            return { success: true };
        } else {
            return { success: false, error: data.error };
        }
    } catch (error) {
        console.error('🔍 Register error:', error);
        return { success: false, error: 'Network error - cannot connect to server' };
    }
}

async function handleLogout() {
    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('🔍 Logout error:', error);
    } finally {
        currentUser = null;
        location.reload();
    }
}

// UI Management
function showUserInfo() {
    console.log('🔍 Showing user info for:', currentUser.username);
    document.getElementById('username-display').textContent = `Welcome, ${currentUser.username}!`;
    document.getElementById('user-info').style.display = 'flex';
    document.getElementById('login-btn').style.display = 'none';
    document.getElementById('register-btn').style.display = 'none';
    document.getElementById('auth-forms').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
    
    // Add direct link to learning platform
    addDirectLearningLink();
}

function showAuthForms() {
    console.log('🔍 Showing auth forms');
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('login-btn').style.display = 'block';
    document.getElementById('register-btn').style.display = 'block';
    document.getElementById('auth-forms').style.display = 'block';
    document.getElementById('main-content').style.display = 'none';
    showForm('login');
}

function showForm(formType) {
    document.getElementById('login-form').classList.remove('active-form');
    document.getElementById('register-form').classList.remove('active-form');
    
    if (formType === 'login') {
        document.getElementById('login-form').classList.add('active-form');
        document.getElementById('login-username').focus();
    } else {
        document.getElementById('register-form').classList.add('active-form');
        document.getElementById('register-username').focus();
    }
}

// Add direct link to learning platform
function addDirectLearningLink() {
    const mainContent = document.getElementById('main-content');
    // Check if link already exists
    if (!document.getElementById('direct-learning-link')) {
        const directLink = document.createElement('div');
        directLink.id = 'direct-learning-link';
        directLink.style.textAlign = 'center';
        directLink.style.marginTop = '30px';
        directLink.style.padding = '20px';
        directLink.style.backgroundColor = '#f8f9fa';
        directLink.style.borderRadius = '10px';
        directLink.innerHTML = `
            <h3>🚀 Ready to Learn?</h3>
            <p>Access the complete learning platform:</p>
            <a href="/learning-platform.html" class="btn btn-success" style="font-size: 1.2rem; padding: 15px 30px; margin: 10px;">
                <i class="fas fa-rocket"></i> Go to Learning Platform
            </a>
            <p style="margin-top: 10px; font-size: 0.9rem; color: #666;">
                Or click the "Start Training" button above
            </p>
        `;
        mainContent.appendChild(directLink);
    }
}

// Test server connection
async function testServerConnection() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        console.log('🔍 Server health:', data);
    } catch (error) {
        console.error('🔍 Server connection test failed:', error);
    }
}

// Test connection on startup
testServerConnection();
