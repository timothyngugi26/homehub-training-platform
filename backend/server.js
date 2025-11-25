const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== RAILWAY-SPECIFIC FIXES =====
const isProduction = process.env.NODE_ENV === 'production';
const isRailway = process.env.RAILWAY === 'true' || isProduction;

console.log(`🚀 Starting Student Training Platform in ${isRailway ? 'PRODUCTION' : 'DEVELOPMENT'} mode...`);

// Trust Railway's proxy (CRITICAL FOR COOKIES)
app.set('trust proxy', 1);

// Ensure database directory exists
if (!fs.existsSync('./database')) {
    fs.mkdirSync('./database', { recursive: true });
    console.log('📁 Created database directory');
}

// ===== FIXED CORS CONFIGURATION =====
const corsOptions = {
    origin: isRailway 
        ? ['https://homehub-training-platform-production.up.railway.app', 'https://homehub-training-platform.railway.app', 'http://localhost:3000']
        : 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== IMPROVED SESSION CONFIGURATION =====
let redisClient;
let sessionStore;

const setupSessionStore = async () => {
    if (isRailway && process.env.REDIS_URL) {
        try {
            console.log('🔗 Connecting to Redis...');
            redisClient = createClient({
                url: process.env.REDIS_URL,
                socket: {
                    connectTimeout: 30000,
                    lazyConnect: true,
                    reconnectStrategy: (retries) => {
                        if (retries > 10) {
                            console.log('❌ Too many Redis retries. Giving up.');
                            return new Error('Too many retries');
                        }
                        return Math.min(retries * 100, 3000);
                    }
                }
            });

            // Redis error handling
            redisClient.on('error', (err) => {
                console.error('❌ Redis Client Error:', err);
            });

            redisClient.on('connect', () => {
                console.log('✅ Redis connected successfully');
            });

            redisClient.on('disconnect', () => {
                console.log('⚠️ Redis disconnected');
            });

            await redisClient.connect();
            
            sessionStore = new RedisStore({
                client: redisClient,
                prefix: "sess:",
                ttl: 86400 // 24 hours in seconds
            });
            
            console.log('✅ Redis session store initialized');
            
        } catch (redisError) {
            console.error('❌ Failed to connect to Redis:', redisError);
            console.log('🔄 Falling back to memory store');
            sessionStore = undefined;
        }
    } else {
        console.log('🔄 Using memory session store (development)');
        sessionStore = undefined;
    }
};

// Initialize session store immediately
setupSessionStore().catch(console.error);

const sessionConfig = {
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'student-platform-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset maxAge on every request
    proxy: true,
    name: 'codetrain.sid',
    cookie: { 
        secure: isRailway,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: isRailway ? 'none' : 'lax',
        domain: isRailway ? 'railway.app' : undefined
        path: '/'
    }
};

// Remove store if Redis connection failed
if (sessionStore === undefined) {
    delete sessionConfig.store;
}

app.use(session(sessionConfig));

// ===== ENHANCED DEBUGGING MIDDLEWARE =====
app.use((req, res, next) => {
    console.log(`=== ${isRailway ? 'RAILWAY' : 'LOCAL'} DEBUG ===`);
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Origin:', req.headers.origin);
    console.log('Host:', req.headers.host);
    console.log('Secure:', req.secure);
    console.log('Session ID:', req.sessionID);
    console.log('User ID in session:', req.session.userId);
    console.log('====================');
    next();
});

// Add request timeout middleware
// app.use((req, res, next) => {
//req.setTimeout(30000, () => { // 30 second timeout
        //console.log(`⏰ Request timeout: ${req.method} ${req.url}`);
    //});
    //next();
//});

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend'), {
    maxAge: isRailway ? '1h' : 0
}));

// Database setup with better error handling
console.log('🗄️  Setting up database...');
const db = new sqlite3.Database('./database/students.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('❌ Database error:', err.message);
        // Don't exit process in production, just log error
        if (!isRailway) process.exit(1);
    }
    console.log('✅ Connected to SQLite database');
});

// Enable WAL mode for better performance
db.configure("busyTimeout", 3000);
db.run("PRAGMA journal_mode = WAL", (err) => {
    if (err) {
        console.error('❌ WAL mode error:', err);
    } else {
        console.log('✅ Database WAL mode enabled');
    }
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
        score INTEGER DEFAULT 0,
        time_spent INTEGER DEFAULT 0,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, module_id)
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

// ===== IMPROVED AUTHENTICATION ROUTES =====

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
        
        // Insert user with timeout
        db.run(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, passwordHash],
            function(err) {
                if (err) {
                    console.error('❌ Registration DB error:', err);
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'Username or email already exists' });
                    }
                    return res.status(500).json({ error: 'Database error' });
                }
                
                // Set session
                req.session.userId = this.lastID;
                req.session.username = username;
                
                // Save session immediately
                req.session.save((err) => {
                    if (err) {
                        console.error('❌ Session save error:', err);
                        return res.status(500).json({ error: 'Session error' });
                    }
                    
                    console.log('✅ User registered:', username);
                    res.json({
                        message: 'Registration successful!',
                        user: {
                            id: this.lastID,
                            username: username,
                            email: email
                        }
                    });
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

        // Find user with timeout handling
        db.get(
            'SELECT * FROM users WHERE username = ?',
            [username],
            async (err, user) => {
                if (err) {
                    console.error('❌ Login DB error:', err);
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

                // Regenerate session to prevent fixation
                req.session.regenerate((err) => {
                    if (err) {
                        console.error('❌ Session regeneration error:', err);
                        return res.status(500).json({ error: 'Session error' });
                    }

                    // Set session
                    req.session.userId = user.id;
                    req.session.username = user.username;
                    
                    // Save session immediately
                    req.session.save((err) => {
                        if (err) {
                            console.error('❌ Session save error:', err);
                            return res.status(500).json({ error: 'Session error' });
                        }
                        
                        console.log('✅ User logged in:', username);
                        res.json({
                            message: 'Login successful!',
                            user: {
                                id: user.id,
                                username: user.username,
                                email: user.email
                            }
                        });
                    });
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
            console.error('❌ Logout error:', err);
            return res.status(500).json({ error: 'Could not log out' });
        }
        
        // Clear cookie
        res.clearCookie('codetrain.sid', {
            domain: isRailway ? '.railway.app' : undefined,
            path: '/'
        });
        
        res.json({ message: 'Logout successful' });
    });
});

// Get current user
app.get('/api/auth/me', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Refresh session
    req.session.touch();
    
    res.json({
        user: {
            id: req.session.userId,
            username: req.session.username
        }
    });
});

// ===== SESSION TEST ENDPOINT =====
app.get('/api/session-test', (req, res) => {
    req.session.testTime = new Date().toISOString();
    req.session.testCount = (req.session.testCount || 0) + 1;
    
    req.session.save((err) => {
        if (err) {
            console.error('❌ Session test save error:', err);
            return res.status(500).json({ error: 'Session save failed' });
        }
        
        res.json({
            sessionId: req.sessionID,
            testTime: req.session.testTime,
            testCount: req.session.testCount,
            userId: req.session.userId,
            environment: isRailway ? 'RAILWAY' : 'LOCAL',
            cookieConfig: {
                secure: isRailway,
                sameSite: isRailway ? 'none' : 'lax'
            }
        });
    });
});

// Health check endpoint with DB check
app.get('/api/health', (req, res) => {
    // Check database connection
    db.get('SELECT 1 as test', (err) => {
        const dbStatus = err ? 'ERROR' : 'OK';
        
        res.json({ 
            status: 'OK', 
            message: 'Student Training Platform is running',
            timestamp: new Date().toISOString(),
            environment: isRailway ? 'production' : 'development',
            platform: 'Railway',
            database: dbStatus,
            redis: redisClient?.isOpen ? 'connected' : 'disconnected'
        });
    });
});

// ... rest of your routes (modules, progress, etc.) remain the same ...

// Add error handling middleware at the end
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Serve frontend for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Shutting down gracefully...');
    
    if (redisClient?.isOpen) {
        redisClient.quit().then(() => {
            console.log('✅ Redis connection closed');
            process.exit(0);
        }).catch(err => {
            console.error('❌ Error closing Redis:', err);
            process.exit(1);
        });
    } else {
        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database:', err);
                process.exit(1);
            }
            console.log('✅ Database connection closed');
            process.exit(0);
        });
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('✅ Server successfully started!');
    console.log('🌐 Frontend URL: https://homehub-training-platform-production.up.railway.app');
    console.log('🔧 Port:', PORT);
    console.log('🚀 Environment:', isRailway ? 'PRODUCTION' : 'DEVELOPMENT');
    console.log('');
    console.log('📚 Student Training Platform Ready!');
    console.log('=====================================');
    console.log('✅ Connected to SQLite database');
    console.log('🔐 Session config:', {
        secure: isRailway,
        sameSite: isRailway ? 'none' : 'lax',
        store: sessionStore ? 'Redis' : 'Memory'
    });
});