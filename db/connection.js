require('dotenv').config();
const mysql = require('mysql2');

// A connection pool is more reliable than a single connection.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'LibraryDB',
  waitForConnections: true,
  connectionLimit: 10
});

// Promise version so we can use async/await in routes.
module.exports = pool.promise();
