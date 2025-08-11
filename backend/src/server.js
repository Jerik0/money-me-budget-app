const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./database/connection');
const { initSchema } = require('./database/schema');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Money Me App API is running!' });
});

// Health check endpoint with database status
app.get('/api/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      timestamp: new Date().toISOString(),
      database: 'error',
      error: error.message
    });
  }
});

// Placeholder routes (we'll implement these next)
app.get('/api/transactions', (req, res) => {
  res.json({ message: 'Get transactions endpoint - coming soon!' });
});

app.post('/api/transactions', (req, res) => {
  res.json({ message: 'Create transaction endpoint - coming soon!' });
});

app.get('/api/categories', (req, res) => {
  res.json({ message: 'Get categories endpoint - coming soon!' });
});

app.post('/api/categories', (req, res) => {
  res.json({ message: 'Create category endpoint - coming soon!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server with database connection check and schema initialization
async function startServer() {
  try {
    // Test database connection first
    console.log('🔍 Testing database connection...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.log('⚠️  Warning: Database not connected, but continuing...');
    } else {
      // Initialize database schema
      console.log('🗄️  Database connected, initializing schema...');
      const schemaInitialized = await initSchema();
      
      if (schemaInitialized) {
        console.log('✅ Database is ready for use');
      } else {
        console.log('⚠️  Schema initialization failed, but continuing...');
      }
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📱 API available at http://localhost:${PORT}`);
      console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🗄️  Database: ${dbConnected ? '✅ Connected' : '❌ Disconnected'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
