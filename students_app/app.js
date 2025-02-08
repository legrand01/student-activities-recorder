document.getElementById('studentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        assignments: document.getElementById('assignments').value,
        assistants: document.getElementById('assistants').value,
        firstName: document.getElementById('firstName').value,
        month: new Date(document.getElementById('month').value).toISOString().split('T')[0]
    };

    try {
        const response = await fetch('/api/record-activity', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        
        if (response.ok) {
            document.getElementById('successMessage').style.display = 'block';
            document.getElementById('errorMessage').style.display = 'none';
            document.getElementById('studentForm').reset();
            
            // Hide success message after 3 seconds
            setTimeout(() => {
                document.getElementById('successMessage').style.display = 'none';
            }, 3000);
        } else {
            throw new Error(result.message || 'Failed to record activity');
        }
    } catch (error) {
        document.getElementById('errorMessage').textContent = `❌ ${error.message}`;
        document.getElementById('errorMessage').style.display = 'block';
        document.getElementById('successMessage').style.display = 'none';
        
        // Hide error message after 5 seconds
        setTimeout(() => {
            document.getElementById('errorMessage').style.display = 'none';
        }, 5000);
    }
});
