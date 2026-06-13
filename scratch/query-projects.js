const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.POSTGRES_URL });
  try {
    await client.connect();
    const res = await client.query('SELECT project_name, github_url FROM developer_projects');
    console.log(res.rows);
    await client.end();
  } catch (e) {
    console.error(e);
  }
}
run();
