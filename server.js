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

// Helper function to generate date array for the current and past N-1 months
function getCurrentAndPastMonthsArray(months) {
    const dates = [];
    const today = new Date();
    
    // Get current month (always include current month)
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // JavaScript months are 0-indexed
    
    // Add current month and past months
    for (let i = 0; i < months; i++) {
        // Calculate year and month by going back i months from current
        let targetMonth = currentMonth - i;
        let targetYear = currentYear;
        
        // Handle month rollover
        while (targetMonth <= 0) {
            targetMonth += 12;
            targetYear -= 1;
        }
        
        // Format as YYYY-MM-15
        const formattedMonth = String(targetMonth).padStart(2, '0');
        dates.push(`${targetYear}-${formattedMonth}-15`);
    }
    
    return dates;
}

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
        // Format the date to be the 15th of the month (as per function requirements)
        const dateObj = new Date(month);
        const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-15`;
        
        const result = await pool.query(
            'SELECT update_student_records($1, $2, $3, $4::date)',
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

// API endpoint to find inactive students
app.post('/api/inactive-students', async (req, res) => {
    const { monthsInactive, startDate, endDate, excludedStudents, gender } = req.body;
    
    try {
        let dates = [];
        
        // Determine which dates to check based on input
        if (monthsInactive === 'custom' && startDate && endDate) {
            // For custom date range, use the provided dates
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            // Format dates to be the 15th of each month
            const startYear = start.getFullYear();
            const startMonth = start.getMonth() + 1;
            const endYear = end.getFullYear();
            const endMonth = end.getMonth() + 1;
            
            // Generate array of dates in the format YYYY-MM-15
            for (let year = startYear; year <= endYear; year++) {
                const monthStart = (year === startYear) ? startMonth : 1;
                const monthEnd = (year === endYear) ? endMonth : 12;
                
                for (let month = monthStart; month <= monthEnd; month++) {
                    dates.push(`${year}-${String(month).padStart(2, '0')}-15`);
                }
            }
        } else if (monthsInactive === 'current') {
            // Just the current month
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            dates = [`${year}-${month}-15`];
        } else {
            // For predefined periods (1, 2, or 3 months)
            const months = parseInt(monthsInactive) || 1;
            dates = getCurrentAndPastMonthsArray(months);
        }
        
        // Parse excluded students
        const excludedArray = excludedStudents ? excludedStudents.split(',').map(name => name.trim()) : [];
        
        // Build the query based on gender filter
        let query = `
            SELECT si.first_name, si.gender, 
                  (SELECT MAX(sa.month) FROM student_activities sa WHERE sa.student_info_id = si.id) as last_activity
            FROM student_info si
            LEFT JOIN (
                SELECT DISTINCT si.id
                FROM student_info si
                JOIN student_activities sa ON si.id = sa.student_info_id
                WHERE sa.month = ANY ($1::date[])
                AND sa.assignments IS NOT NULL
            ) active ON si.id = active.id
            WHERE active.id IS NULL
        `;
        
        const queryParams = [dates];
        
        // Add gender filter if specified
        if (gender && gender !== 'all') {
            query += ` AND si.gender = $2`;
            queryParams.push(gender.charAt(0).toUpperCase() + gender.slice(1)); // Capitalize first letter
        }
        
        // Add excluded students
        if (excludedArray.length > 0) {
            const paramIndex = queryParams.length + 1;
            query += ` AND si.first_name NOT IN (SELECT unnest($${paramIndex}::text[]))`;
            queryParams.push(excludedArray);
        }
        
        // Order by name
        query += ` ORDER BY si.first_name`;
        
        const result = await pool.query(query, queryParams);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to find inactive students'
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
