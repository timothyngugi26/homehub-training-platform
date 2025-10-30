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
const startTrainingBtn = document.getElementById('start-training-btn');
const userInfo = document.getElementById('user-info');
const usernameDisplay = document.getElementById('username-display');
const logoutBtn = document.getElementById('logout-btn');
const showRegister = document.getElementById('show-register');
const showLogin = document.getElementById('show-login');
const doLogin = document.getElementById('do-login');
const doRegister = document.getElementById('do-register');
const statusMessage = document.getElementById('status-message');

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 CodeTrain Frontend Initialized');
    checkAuthStatus();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Auth buttons
    loginBtn.addEventListener('click', () => showForm('login'));
    registerBtn.addEventListener('click', () => showForm('register'));
    
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
    
    // Enter key support for forms
    document.getElementById('login-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    document.getElementById('register-confirm').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleRegister();
    });
}

// Authentication functions
async function checkAuthStatus() {
    try {
        showStatus('Checking authentication...', 'info');
        const response = await fetch(`${API_BASE}/auth/me`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            showUserInfo();
            showStatus('Welcome back!', 'success');
        } else {
            showAuthForms();
        }
    } catch (error) {
        console.log('Not logged in');
        showAuthForms();
    }
}

async function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        showStatus('Please enter both username and password', 'error');
        return;
    }
    
    showStatus('Signing in...', 'info');
    
    const result = await loginUser(username, password);
    if (result.success) {
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        showStatus('Login successful!', 'success');
    } else {
        showStatus(result.error, 'error');
    }
}

async function handleRegister() {
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    
    if (!username || !email || !password || !confirm) {
        showStatus('Please fill in all fields', 'error');
        return;
    }
    
    if (password !== confirm) {
        showStatus('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 6) {
        showStatus('Password must be at least 6 characters', 'error');
        return;
    }
    
    showStatus('Creating account...', 'info');
    
    const result = await registerUser({ username, email, password });
    if (result.success) {
        // Clear form fields
        document.getElementById('register-username').value = '';
        document.getElementById('register-email').value = '';
        document.getElementById('register-password').value = '';
        document.getElementById('register-confirm').value = '';
        showStatus('Account created successfully!', 'success');
    } else {
        showStatus(result.error, 'error');
    }
}

async function loginUser(username, password) {
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            showUserInfo();
            return { success: true };
        } else {
            return { success: false, error: data.error };
        }
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Network error - cannot connect to server' };
    }
}

async function registerUser(userData) {
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(userData)
        });

        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            showUserInfo();
            return { success: true };
        } else {
            return { success: false, error: data.error };
        }
    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, error: 'Network error - cannot connect to server' };
    }
}

async function handleLogout() {
    try {
        showStatus('Logging out...', 'info');
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        currentUser = null;
        showAuthForms();
        showStatus('Logged out successfully', 'success');
    }
}

// UI Management
function showUserInfo() {
    usernameDisplay.textContent = `Welcome, ${currentUser.username}!`;
    userInfo.style.display = 'flex';
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    authForms.style.display = 'none';
    mainContent.style.display = 'block';
}

function showAuthForms() {
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

function startTraining() {
    showStatus('Loading training interface...', 'info');
    // In a real app, this would load the training modules
    setTimeout(() => {
        showStatus('Training interface coming soon!', 'success');
    }, 1000);
}

// Status messages
function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message';
    
    if (type === 'success') {
        statusMessage.classList.add('status-success');
    } else if (type === 'error') {
        statusMessage.classList.add('status-error');
    }
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 5000);
}

// Health check (optional)
async function checkServerHealth() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        console.log('Server health:', data);
    } catch (error) {
        console.error('Server health check failed:', error);
    }
}
// Learning Platform JavaScript
let currentModule = null;
let userProgress = {};

// Initialize learning platform
function initializeLearningPlatform() {
    loadModules();
    setupPracticeArea();
    loadUserProgress();
}

// Load all learning modules
async function loadModules() {
    try {
        const response = await fetch('/api/modules');
        const data = await response.json();
        
        if (response.ok) {
            displayModules(data.modules);
        } else {
            showStatus('Failed to load modules', 'error');
        }
    } catch (error) {
        showStatus('Network error loading modules', 'error');
    }
}

// Display modules in sidebar
function displayModules(modules) {
    const moduleList = document.getElementById('module-list');
    moduleList.innerHTML = '';
    
    modules.forEach(module => {
        const moduleItem = document.createElement('div');
        moduleItem.className = `module-item ${userProgress[module.id]?.completed ? 'completed' : ''}`;
        moduleItem.innerHTML = `
            <div class="module-title">${module.id}. ${module.title}</div>
            <div class="module-meta">
                <span class="difficulty">${module.difficulty}</span> • 
                <span class="time">${module.estimated_time}</span>
            </div>
        `;
        
        moduleItem.addEventListener('click', () => loadModule(module.id));
        moduleList.appendChild(moduleItem);
    });
}

// Load specific module
async function loadModule(moduleId) {
    try {
        const response = await fetch(`/api/modules/${moduleId}`);
        const data = await response.json();
        
        if (response.ok) {
            currentModule = data.module;
            displayModuleContent(data.module);
            updateActiveModule(moduleId);
        } else {
            showStatus('Failed to load module', 'error');
        }
    } catch (error) {
        showStatus('Network error loading module', 'error');
    }
}

// Display module content
function displayModuleContent(module) {
    const moduleDisplay = document.getElementById('module-display');
    
    moduleDisplay.innerHTML = `
        <div class="module-header">
            <h2>${module.title}</h2>
            <div class="module-meta">
                <span class="difficulty">${module.difficulty}</span> • 
                <span class="time">${module.estimated_time}</span>
            </div>
        </div>
        
        <div class="story-section">
            <h3>📖 The Story</h3>
            <p>${module.content.story.replace(/\n/g, '<br>')}</p>
        </div>
        
        ${module.content.concepts.map(concept => `
            <div class="concept-card">
                <h4>${concept.title}</h4>
                <p>${concept.explanation}</p>
                
                ${concept.example ? `
                    <div class="code-example">
                        <pre>${concept.example}</pre>
                    </div>
                ` : ''}
                
                ${concept.analogy ? `
                    <div class="analogy">
                        <strong>💡 Real-world analogy:</strong> ${concept.analogy}
                    </div>
                ` : ''}
            </div>
        `).join('')}
        
        ${module.content.exercises ? `
            <div class="exercises-section">
                <h3>🛠️ Hands-on Exercises</h3>
                ${module.content.exercises.map((exercise, index) => `
                    <div class="exercise-section">
                        <div class="exercise-header">
                            <div class="exercise-title">Exercise ${index + 1}: ${exercise.title}</div>
                        </div>
                        <p>${exercise.description}</p>
                        
                        <div class="code-example">
                            <pre>${exercise.starter_code}</pre>
                        </div>
                        
                        <button class="hint-toggle" onclick="toggleHints(${index})">
                            💡 Show Hints
                        </button>
                        
                        <div class="hint-section" id="hints-${index}">
                            <h4>Hints:</h4>
                            <ul>
                                ${exercise.hints.map(hint => `<li>${hint}</li>`).join('')}
                            </ul>
                            <button class="btn btn-success" onclick="showSolution(${index})">
                                Show Solution
                            </button>
                            <div class="solution" id="solution-${index}" style="display: none;">
                                <pre>${exercise.solution}</pre>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : ''}
        
        ${module.content.quiz ? `
            <div class="quiz-section">
                <h3>🧠 Quick Quiz</h3>
                ${module.content.quiz.map((quizItem, index) => `
                    <div class="quiz-item">
                        <div class="quiz-question">${index + 1}. ${quizItem.question}</div>
                        <div class="quiz-options">
                            ${quizItem.options.map((option, optIndex) => `
                                <div class="quiz-option" onclick="selectAnswer(${index}, ${optIndex})">
                                    ${String.fromCharCode(65 + optIndex)}) ${option}
                                </div>
                            `).join('')}
                        </div>
                        <div class="quiz-feedback" id="feedback-${index}">
                            ${quizItem.explanation}
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : ''}
        
        <div class="module-actions">
            <button class="btn btn-success" onclick="completeModule(${module.id})">
                ✅ Mark as Complete
            </button>
        </div>
    `;
}

// Practice area setup
function setupPracticeArea() {
    // Terminal functionality
    const terminalInput = document.getElementById('terminal-input');
    const terminal = document.getElementById('python-terminal');
    
    terminalInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const command = terminalInput.value.trim();
            executePythonCommand(command);
            terminalInput.value = '';
        }
    });
    
    // Editor functionality
    document.getElementById('run-code').addEventListener('click', runEditorCode);
    document.getElementById('clear-terminal').addEventListener('click', clearTerminal);
    document.getElementById('clear-editor').addEventListener('click', clearEditor);
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
}

// Execute Python commands in terminal
function executePythonCommand(command) {
    const terminal = document.getElementById('python-terminal');
    const inputLine = terminal.querySelector('.input-line');
    
    // Add the command to output
    const commandElement = document.createElement('div');
    commandElement.className = 'output';
    commandElement.innerHTML = `<span class="prompt">>>></span> ${command}`;
    terminal.insertBefore(commandElement, inputLine);
    
    try {
        // Simple Python command execution simulation
        let result;
        if (command.includes('print(')) {
            const content = command.match(/print\(["'](.*)["']\)/);
            result = content ? content[1] : 'Printed something!';
        } else if (command.includes('+')) {
            const numbers = command.split('+').map(n => parseInt(n.trim()));
            result = numbers.reduce((a, b) => a + b, 0);
        } else if (command.includes('*')) {
            const numbers = command.split('*').map(n => parseInt(n.trim()));
            result = numbers.reduce((a, b) => a * b, 1);
        } else {
            result = eval(command);
        }
        
        const resultElement = document.createElement('div');
        resultElement.className = 'output';
        resultElement.textContent = result;
        terminal.insertBefore(resultElement, inputLine);
        
    } catch (error) {
        const errorElement = document.createElement('div');
        errorElement.className = 'output error';
        errorElement.textContent = `Error: ${error.message}`;
        terminal.insertBefore(errorElement, inputLine);
    }
    
    terminal.scrollTop = terminal.scrollHeight;
}

// Run code from editor
function runEditorCode() {
    const code = document.getElementById('code-editor').value;
    const output = document.getElementById('output-content');
    
    try {
        // Simple code execution simulation
        const result = eval(code);
        output.innerHTML = `<div class="output-line">${result}</div>`;
    } catch (error) {
        output.innerHTML = `<div class="output-line error">Error: ${error.message}</div>`;
    }
}

// Helper functions
function toggleHints(exerciseIndex) {
    const hints = document.getElementById(`hints-${exerciseIndex}`);
    hints.style.display = hints.style.display === 'none' ? 'block' : 'none';
}

function showSolution(exerciseIndex) {
    const solution = document.getElementById(`solution-${exerciseIndex}`);
    solution.style.display = 'block';
}

function selectAnswer(quizIndex, optionIndex) {
    const quizItem = currentModule.content.quiz[quizIndex];
    const feedback = document.getElementById(`feedback-${quizIndex}`);
    
    // Remove selected class from all options
    document.querySelectorAll(`.quiz-option`).forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Add selected class to clicked option
    event.target.classList.add('selected');
    
    // Show feedback
    feedback.classList.add(optionIndex === quizItem.correct ? 'correct' : 'incorrect');
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
}

function clearTerminal() {
    const terminal = document.getElementById('python-terminal');
    const inputLine = terminal.querySelector('.input-line');
    terminal.innerHTML = '';
    terminal.appendChild(inputLine);
}

function clearEditor() {
    document.getElementById('code-editor').value = '';
    document.getElementById('output-content').innerHTML = '';
}

function updateActiveModule(moduleId) {
    document.querySelectorAll('.module-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.module-item:nth-child(${moduleId})`).classList.add('active');
}

async function completeModule(moduleId) {
    try {
        const response = await fetch('/api/progress', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                moduleId: moduleId,
                completed: true,
                score: 100,
                timeSpent: 30 // minutes
            })
        });
        
        if (response.ok) {
            showStatus('Module completed! Great job! 🎉', 'success');
            userProgress[moduleId] = { completed: true, score: 100 };
            loadModules(); // Refresh module list
        }
    } catch (error) {
        showStatus('Error saving progress', 'error');
    }
}

async function loadUserProgress() {
    try {
        const response = await fetch('/api/progress', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            data.progress.forEach(progress => {
                userProgress[progress.module_id] = progress;
            });
            updateProgressStats();
        }
    } catch (error) {
        console.log('No progress data found');
    }
}

function updateProgressStats() {
    const completed = Object.values(userProgress).filter(p => p.completed).length;
    const totalScore = Object.values(userProgress).reduce((sum, p) => sum + (p.score || 0), 0);
    
    document.getElementById('completed-modules').textContent = completed;
    document.getElementById('total-score').textContent = totalScore;
}

// Initialize learning platform when user logs in
// Add this to your showUserInfo function:
function showUserInfo() {
    usernameDisplay.textContent = `Welcome, ${currentUser.username}!`;
    userInfo.style.display = 'flex';
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    authForms.style.display = 'none';
    mainContent.style.display = 'block';
    
    // Initialize learning platform
    initializeLearningPlatform();
}
// Initialize health check
checkServerHealth();
