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

// Import database functions
const { query } = require('./database/connection');

// Get all transactions
app.get('/api/transactions', async (req, res) => {
  try {
    const result = await query(`
      SELECT t.id, t.description, t.amount, t.type, t.date, c.name as category
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      ORDER BY t.date DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const result = await query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get recurring transactions
app.get('/api/recurring-transactions', async (req, res) => {
  try {
    const result = await query(`
      SELECT r.id, r.description, r.amount, r.frequency, r.start_date, c.name as category
      FROM recurring_transactions r
      LEFT JOIN categories c ON r.category_id = c.id
      ORDER BY r.frequency, r.amount DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recurring transactions:', error);
    res.status(500).json({ error: 'Failed to fetch recurring transactions' });
  }
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
