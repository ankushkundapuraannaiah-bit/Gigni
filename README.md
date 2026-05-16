# Gigni — The Agentic AI Platform

Gigni is a student-driven ecosystem for AI developers, featuring project-based careers, global collaboration, and agentic building tools.

## Architecture
- **Frontend**: Static HTML/CSS/JS located in the `public/` directory.
- **Backend**: Express.js serverless functions in the `api/` directory.
- **Database**: Vercel Postgres (PostgreSQL) for production.

## Local Development
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```env
   POSTGRES_URL=your_postgres_connection_string
   GMAIL_USER=your_gmail_address
   GMAIL_APP_PASSWORD=your_gmail_app_password
   ```
4. Run the server:
   ```bash
   npm start
   ```
5. Initialize the database schema by visiting:
   `http://localhost:3000/api/init`

## Deployment (Vercel)
The project is configured for seamless deployment on Vercel using `vercel.json`.
1. Push your code to GitHub.
2. Connect your GitHub repository to Vercel.
3. Link a **Vercel Postgres** database to the project.
4. Add the `GMAIL_USER` and `GMAIL_APP_PASSWORD` environment variables in the Vercel dashboard.
5. Deploy and visit `your-domain.vercel.app/api/init` once to set up the tables.

## Security
- Passwords are hashed using `bcryptjs`.
- Sensitive data is excluded from API responses.
- Admin endpoints are protected by email verification.
