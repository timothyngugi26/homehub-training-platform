const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';
const railwayUrl = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL;
const frontendUrl = railwayUrl ? `https://${railwayUrl}` : `http://localhost:${PORT}`;

console.log(`🚀 Starting Student Training Platform in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode...`);
console.log(`🌐 Frontend URL: ${frontendUrl}`);
console.log(`🔧 Port: ${PORT}`);

// Ensure directories exist
if (!fs.existsSync('./database')) {
    fs.mkdirSync('./database', { recursive: true });
    console.log('📁 Created database directory');
}

// Middleware
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            frontendUrl,
            'http://localhost:3000',
            'https://homehub-training-platform-production.up.railway.app'
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('railway.app')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration for production (using default MemoryStore with warning suppressed)
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-production-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: isProduction, // Use secure cookies in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: isProduction ? 'none' : 'lax'
    },
    name: 'codetrain.sid'
}));

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend'), {
    maxAge: isProduction ? '1d' : 0 // Cache in production
}));

// Database setup
const dbPath = './database/students.db';
console.log(`🗄️ Database path: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Database error:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to SQLite database');
});

// Initialize database tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    console.log('✅ Users table ready');
});

// ===== API ROUTES =====

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Student Training Platform is running',
        environment: process.env.NODE_ENV || 'development',
        frontendUrl: frontendUrl,
        timestamp: new Date().toISOString()
    });
});

// Register new user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        console.log('📝 Registration attempt:', username);
        
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
        
        console.log('🔐 Login attempt:', username);
        
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

// Serve frontend for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('✅ Server successfully started!');
    console.log('🌐 Your app is available at: ' + frontendUrl);
    console.log('🔧 API Health: ' + frontendUrl + '/api/health');
    console.log('🚀 Environment: ' + (isProduction ? 'PRODUCTION' : 'DEVELOPMENT'));
    console.log('');
    console.log('📚 Student Training Platform Ready!');
    console.log('=====================================');
    console.log('ℹ️  Note: Using MemoryStore for sessions (ok for demo)');
});
