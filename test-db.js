const { Client } = require('pg');
require('dotenv').config();

async function test() {
  console.log('URL:', process.env.POSTGRES_URL);
  const client = new Client({ connectionString: process.env.POSTGRES_URL });
  try {
    await client.connect();
    console.log('Connected');
    await client.end();
  } catch (e) {
    console.error('Error:', e);
  }
}

test();