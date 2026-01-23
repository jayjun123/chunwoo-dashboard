const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
});

const initDB = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS mail_summaries (
      id SERIAL PRIMARY KEY,
      message_id VARCHAR(512) UNIQUE,
      sender_name VARCHAR(255),
      sender_email VARCHAR(255),
      company_name VARCHAR(255),
      subject TEXT,
      received_at TIMESTAMP,
      is_read BOOLEAN DEFAULT FALSE,
      ai_classification VARCHAR(50),
      summary TEXT,
      importance VARCHAR(20),
      attachments JSONB DEFAULT '[]'
    );
  `;
  await pool.query(queryText);

  const alterQueries = [
    "ALTER TABLE mail_summaries ADD COLUMN IF NOT EXISTS message_id VARCHAR(512) UNIQUE;",
    "ALTER TABLE mail_summaries ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';",
  ];

  for (const alterQuery of alterQueries) {
    await pool.query(alterQuery);
  }
};

module.exports = { pool, initDB };
