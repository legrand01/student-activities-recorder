import express from 'express';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Middleware for logging
// Serve static files first
app.use(express.static(path.join(__dirname, 'students_app'), {
    extensions: ['html', 'js']
}));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Parse JSON bodies
app.use(express.json());

// Root route - fallback to index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'students_app', 'index.html'));
});

// API routes

// Database configuration
const pool = new pg.Pool({
    database: 'clamv2',
    host: 'localhost',
    port: 5432
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Database connected successfully');
    }
});

app.post('/api/record-activity', async (req, res) => {
    const { assignments, assistants, firstName, month } = req.body;

    try {
        // Parse the date and format it as YYYY-MM-DD
        const date = new Date(month);
        const formattedDate = date.toISOString().split('T')[0];

        const result = await pool.query(
            'SELECT update_student_records($1, $2, $3, $4)',
            [assignments, assistants, firstName, formattedDate]
        );

        if (result.rows.length > 0) {
            res.json({ success: true, data: result.rows[0] });
        } else {
            res.status(404).json({ 
                success: false, 
                message: `No student found with first name: ${firstName}` 
            });
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to record activity' 
        });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

// Handle 404s - This should be the last middleware
app.use((req, res) => {
    console.log(`404: ${req.url}`);
    res.status(404).send('Resource not found');
});
