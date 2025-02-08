# Student Activities Recorder

A web application for recording and managing student activities. Built with Node.js, Express, and PostgreSQL.

## Features

- Record student assignments and activities
- Track assistants for each activity
- Date-based activity tracking
- Real-time form validation and feedback
- PostgreSQL database integration

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Access the application at http://localhost:3000

## Database Requirements

The application requires a PostgreSQL `database_name` with:
- `student_info` table containing student information
- `student_activities` table for recording activities
- `update_student_records` function for handling activity updates

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: PostgreSQL
