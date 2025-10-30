// API base URL
const API_BASE = '/api';

// Current user state
let currentUser = null;

// DOM Elements
const authForms = document.getElementById('auth-forms');
const mainContent = document.getElementById('main-content');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const userInfo = document.getElementById('user-info');
const usernameDisplay = document.getElementById('username-display');
const logoutBtn = document.getElementById('logout-btn');
const showRegister = document.getElementById('show-register');
const showLogin = document.getElementById('show-login');
const doLogin = document.getElementById('do-login');
const doRegister = document.getElementById('do-register');
const startTrainingBtn = document.getElementById('start-training-btn');

console.log('🚀 CodeTrain Frontend Initialized');

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
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
    // Auth buttons
    loginBtn.addEventListener('click', () => {
        console.log('🔍 Login button clicked');
        showForm('login');
    });
    
    registerBtn.addEventListener('click', () => {
        console.log('🔍 Register button clicked');
        showForm('register');
    });
    
    // Form switches
    showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        showForm('register');
    });
    
    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        showForm('login');
    });
    
    // Form submissions
    doLogin.addEventListener('click', handleLogin);
    doRegister.addEventListener('click', handleRegister);
    
    // User actions
    logoutBtn.addEventListener('click', handleLogout);
    startTrainingBtn.addEventListener('click', startTraining);
    
    // Enter key support
    document.getElementById('login-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    document.getElementById('register-confirm').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleRegister();
    });
}

// Start Training function
function startTraining() {
    console.log('🔍 Start Training clicked');
    // Redirect to learning platform
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
    usernameDisplay.textContent = `Welcome, ${currentUser.username}!`;
    userInfo.style.display = 'flex';
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    authForms.style.display = 'none';
    mainContent.style.display = 'block';
}

function showAuthForms() {
    console.log('🔍 Showing auth forms');
    userInfo.style.display = 'none';
    loginBtn.style.display = 'block';
    registerBtn.style.display = 'block';
    authForms.style.display = 'block';
    mainContent.style.display = 'none';
    showForm('login');
}

function showForm(formType) {
    loginForm.classList.remove('active-form');
    registerForm.classList.remove('active-form');
    
    if (formType === 'login') {
        loginForm.classList.add('active-form');
        document.getElementById('login-username').focus();
    } else {
        registerForm.classList.add('active-form');
        document.getElementById('register-username').focus();
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
