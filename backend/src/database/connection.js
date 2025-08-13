const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'postgres', // Try default postgres user
  host: process.env.DB_HOST || 'localhost', // Use localhost since we're running from host and DB is port-forwarded
  database: process.env.DB_NAME || 'money_me_app',
  password: process.env.DB_PASSWORD || 'postgres', // Try default postgres password
  port: process.env.DB_PORT || 5432,
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Debug: Log the actual configuration being used
console.log('🔍 Database connection config:', {
  user: dbConfig.user,
  host: dbConfig.host,
  database: dbConfig.database,
  password: dbConfig.password ? '***' : 'undefined',
  port: dbConfig.port
});

// Create a new pool instance
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test the database connection
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Database connected successfully');
    client.release();
    return true;
  } catch (err) {
    console.error('Database connection failed:', err.message);
    return false;
  }
}

// Get a client from the pool
async function getClient() {
  return await pool.connect();
}

// Execute a query with parameters
async function query(text, params) {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  }
}

// Close the pool (call this when shutting down the app)
async function closePool() {
  await pool.end();
  console.log('Database pool closed');
}

module.exports = {
  pool,
  testConnection,
  getClient,
  query,
  closePool
};
