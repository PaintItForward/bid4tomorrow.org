// db.js
// Database connection pool for PostgreSQL using `pg`
require('dotenv').config();

const { Pool } = require('pg');

// Create a connection pool using DATABASE_URL from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Export the pool so other files can use it
module.exports = pool;
