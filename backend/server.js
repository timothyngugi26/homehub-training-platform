const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const fs = require('fs');

const app = express();
const PORT = 3000;

console.log('🚀 Starting Student Training Platform...');

// Ensure database directory exists
if (!fs.existsSync('./database')) {
    fs.mkdirSync('./database', { recursive: true });
    console.log('📁 Created database directory');
}
// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration - UPDATED
app.use(session({
    secret: 'student-platform-secret-key-' + Math.random().toString(36).substring(2),
    resave: true,
    saveUninitialized: true,
    cookie: { 
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
    },
    name: 'codetrain.sid'
}));
// Add this after your session middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Session:', req.session);
    next();
});

// Add error handling middleware at the end
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Database setup
console.log('🗄️  Setting up database...');
const db = new sqlite3.Database('./database/students.db', (err) => {
    if (err) {
        console.error('❌ Database error:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to SQLite database');
});

// Initialize database tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Progress table
    db.run(`CREATE TABLE IF NOT EXISTS user_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        module_id INTEGER NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Modules table
    db.run(`CREATE TABLE IF NOT EXISTS modules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        content TEXT,
        order_index INTEGER
    )`);
    
    console.log('✅ Database tables created');
});

// ===== AUTHENTICATION ROUTES =====

// Register new user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        console.log('📝 Registration attempt for:', username);
        
        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Insert user
        db.run(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, passwordHash],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'Username or email already exists' });
                    }
                    return res.status(500).json({ error: 'Database error' });
                }
                
                // Set session
                req.session.userId = this.lastID;
                req.session.username = username;
                
                console.log('✅ User registered:', username);
                res.json({
                    message: 'Registration successful!',
                    user: {
                        id: this.lastID,
                        username: username,
                        email: email
                    }
                });
            }
        );
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('🔐 Login attempt for:', username);
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Find user
        db.get(
            'SELECT * FROM users WHERE username = ?',
            [username],
            async (err, user) => {
                if (err) {
                    console.error('❌ Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                if (!user) {
                    return res.status(401).json({ error: 'Invalid username or password' });
                }

                // Verify password
                const isValidPassword = await bcrypt.compare(password, user.password_hash);
                if (!isValidPassword) {
                    return res.status(401).json({ error: 'Invalid username or password' });
                }

                // Set session
                req.session.userId = user.id;
                req.session.username = user.username;
                
                console.log('✅ User logged in:', username);
                res.json({
                    message: 'Login successful!',
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email
                    }
                });
            }
        );
        
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout user
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Could not log out' });
        }
        res.json({ message: 'Logout successful' });
    });
});

// Get current user
app.get('/api/auth/me', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    res.json({
        user: {
            id: req.session.userId,
            username: req.session.username
        }
    });
});

// ===== TRAINING ROUTES =====

// Get all modules
app.get('/api/modules', (req, res) => {
    db.all('SELECT * FROM modules ORDER BY order_index', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ modules: rows });
    });
});

// Get user progress
app.get('/api/progress', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    db.all(
        `SELECT up.*, m.title 
         FROM user_progress up 
         JOIN modules m ON up.module_id = m.id 
         WHERE up.user_id = ?`,
        [req.session.userId],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ progress: rows });
        }
    );
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Student Training Platform is running',
        timestamp: new Date().toISOString()
    });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ===== LEARNING MODULES API =====

// Get all modules
app.get('/api/modules', (req, res) => {
    const modules = [
        {
            id: 1,
            title: "Hello Python - Talking to the Computer",
            description: "Learn the basics of Python programming",
            difficulty: "beginner",
            estimated_time: "30 minutes",
            order_index: 1,
            content: {
                story: `🧭 Welcome to Python! Think of Python as teaching a robot to follow your instructions.
                
                When you type commands, your robot listens carefully and does exactly what you say.
                
                Let's start with the most important command - making your robot speak!`,
                
                concepts: [
                    {
                        title: "Print Function - Making the Robot Speak",
                        explanation: `The print() function is how your Python robot speaks to you. Whatever you put inside the parentheses, your robot will say out loud!`,
                        example: `print("Hello, world!")  # Robot says: Hello, world!
print("I'm learning Python!")  # Robot says: I'm learning Python!`,
                        analogy: "Think of print() like telling your robot: 'Say this out loud!'"
                    },
                    {
                        title: "Variables - Naming Your Storage Boxes",
                        explanation: `Variables are like labeled boxes where you can store information. Once you put something in a box, you can use the label to get it back later.`,
                        example: `# Create variables (storage boxes)
name = "Alex"
age = 12
is_student = True

# Use the variables
print("Hello, " + name)
print("You are " + str(age) + " years old")`,
                        analogy: "Variables are like name tags on your school supplies - you put a label so you can find it later!"
                    },
                    {
                        title: "Data Types - Different Kinds of Information",
                        explanation: `Python understands different types of information, just like you understand numbers, words, and true/false questions.`,
                        example: `# String - for text (words)
name = "Sarah"
message = "Hello there!"

# Integer - for whole numbers
age = 13
score = 95

# Float - for decimal numbers
height = 1.65
temperature = 23.5

# Boolean - for True/False
is_sunny = True
is_raining = False`,
                        analogy: "Data types are like different subjects in school - math uses numbers, English uses words, science uses true/false experiments!"
                    }
                ],
                
                exercises: [
                    {
                        title: "Make Your Robot Greet You",
                        description: "Create a program that greets you by name and tells you your age",
                        starter_code: `# TODO: Create variables for your name and age
name = "Your Name Here"
age = 12

# TODO: Make the robot greet you
print("")`,
                        solution: `name = "Alex"
age = 12

print("Hello, " + name + "!")
print("You are " + str(age) + " years old!")
print("Nice to meet you!")`,
                        hints: [
                            "Use the print() function to make the robot speak",
                            "Combine text and variables using the + operator",
                            "Don't forget to convert numbers to text using str()"
                        ]
                    },
                    {
                        title: "Dog Years Calculator",
                        description: "Calculate how old you would be in dog years (1 human year = 7 dog years)",
                        starter_code: `# TODO: Calculate dog years
human_age = 12
dog_years = 

print("If you're " + str(human_age) + " in human years...")
print("You're " + str(dog_years) + " in dog years!")`,
                        solution: `human_age = 12
dog_years = human_age * 7

print("If you're " + str(human_age) + " in human years...")
print("You're " + str(dog_years) + " in dog years!")`,
                        hints: [
                            "Multiply human_age by 7 to get dog years",
                            "Make sure to use the multiplication operator *",
                            "Check your math - 12 human years should be 84 dog years!"
                        ]
                    }
                ],
                
                quiz: [
                    {
                        question: "What does the print() function do?",
                        options: [
                            "Makes the computer print on paper",
                            "Displays text on the screen",
                            "Creates a new variable",
                            "Does math calculations"
                        ],
                        correct: 1,
                        explanation: "print() displays text on the screen - it's how your Python robot 'speaks' to you!"
                    },
                    {
                        question: "Which of these is a valid variable name?",
                        options: [
                            "my name",
                            "123name",
                            "my_name",
                            "print"
                        ],
                        correct: 2,
                        explanation: "Variable names can't have spaces, can't start with numbers, and can't be Python keywords like 'print'"
                    }
                ]
            }
        },
        {
            id: 2,
            title: "Functions - Teaching the Robot New Tricks",
            description: "Learn to create reusable code with functions",
            difficulty: "beginner", 
            estimated_time: "45 minutes",
            order_index: 2,
            content: {
                story: `🎩 Welcome to Functions - where you teach your robot magic tricks!
                
                Functions are like recipes. Once you create a recipe (like "how to make a sandwich"), you can use it anytime without writing all the steps again.
                
                Let's teach your robot some cool tricks!`,
                
                concepts: [
                    {
                        title: "Creating Functions - Writing Your Recipes",
                        explanation: `Functions are blocks of code that you can define once and use many times. They make your code organized and reusable.`,
                        example: `# Define a function (create a recipe)
def greet():
    print("Hello there!")
    print("Welcome to Python!")

# Use the function (follow the recipe)
greet()
greet()  # You can use it multiple times!`,
                        analogy: "Functions are like dance routines - learn the steps once, then perform them anytime!"
                    },
                    {
                        title: "Function Parameters - Customizing Your Recipes", 
                        explanation: `Parameters let you pass information to functions, making them flexible and customizable.`,
                        example: `# Function with parameters
def greet_person(name):
    print("Hello, " + name + "!")
    print("Nice to meet you!")

# Use with different names
greet_person("Alice")
greet_person("Bob")
greet_person("Charlie")`,
                        analogy: "Parameters are like blank spaces in a mad lib - you fill them in differently each time!"
                    },
                    {
                        title: "Return Values - Getting Answers Back",
                        explanation: `Functions can return values back to you, like a calculator giving you the answer to a math problem.`,
                        example: `# Function that returns a value
def add_numbers(a, b):
    result = a + b
    return result

# Use the returned value
sum = add_numbers(5, 3)
print("The sum is: " + str(sum))

# You can use it directly in print
print("10 + 15 = " + str(add_numbers(10, 15)))`,
                        analogy: "Return values are like asking a question and getting an answer - the function does the work and gives you back the result!"
                    }
                ],
                
                exercises: [
                    {
                        title: "Math Helper Functions",
                        description: "Create a set of math helper functions for common calculations",
                        starter_code: `# TODO: Create math functions
def add(a, b):
    # Return the sum of a and b
    return

def multiply(a, b):
    # Return a multiplied by b
    return

def square(x):
    # Return x squared (x * x)
    return

# Test your functions
print("5 + 3 = " + str(add(5, 3)))
print("4 * 6 = " + str(multiply(4, 6)))
print("7 squared = " + str(square(7)))`,
                        solution: `def add(a, b):
    return a + b

def multiply(a, b):
    return a * b

def square(x):
    return x * x

print("5 + 3 = " + str(add(5, 3)))
print("4 * 6 = " + str(multiply(4, 6))) 
print("7 squared = " + str(square(7)))`,
                        hints: [
                            "Use the + operator for addition",
                            "Use the * operator for multiplication", 
                            "To square a number, multiply it by itself"
                        ]
                    }
                ]
            }
        }
        // More modules would be added here...
    ];
    
    res.json({ modules: modules });
});

// Get specific module
app.get('/api/modules/:id', (req, res) => {
    const moduleId = parseInt(req.params.id);
    // In a real app, you'd fetch from database
    // For now, we'll return from the array above
    res.json({ module: modules.find(m => m.id === moduleId) });
});

// Save user progress
app.post('/api/progress', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { moduleId, completed, score, timeSpent } = req.body;
    
    db.run(
        `INSERT OR REPLACE INTO user_progress (user_id, module_id, completed, score, time_spent) 
         VALUES (?, ?, ?, ?, ?)`,
        [req.session.userId, moduleId, completed, score, timeSpent],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ message: 'Progress saved successfully' });
        }
    );
});
// Start server
app.listen(PORT, () => {
    console.log('✅ Server successfully started!');
    console.log('🌐 Frontend: http://localhost:' + PORT);
    console.log('🔧 API Health: http://localhost:' + PORT + '/api/health');
    console.log('');
    console.log('📚 Student Training Platform Ready!');
    console.log('=====================================');
    console.log('You can now:');
    console.log('1. Open http://localhost:3000 in your browser');
    console.log('2. Register a new account');
    console.log('3. Login and start learning!');
    console.log('=====================================');
});
