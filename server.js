const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path'); // <-- NEW: Import path module
require('dotenv').config(); 

const app = express();
const PORT = 3000; 

// Middleware setup
app.use(cors()); 
app.use(express.json());

// Route to serve the results page

// <-- NEW: Middleware to serve static files -->
// This tells Express to look for files (like login.html, dashboard.html) 
// in the current directory (where server.js lives).
app.use(express.static(__dirname));

// Fix the default route to redirect to your login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html')); // Assuming you have login.html
});

// Mock Login/Signup Endpoint 
app.post('/api/auth/login-signup', (req, res) => {
    console.log('Login attempt received:', req.body.email);
    res.json({
        success: true,
        redirect: '/dashboard.html' // Use dashboard.html (not dashboard-1.html)
    });
});

// AI Chat Endpoint 
app.post('/api/get-ai-response', async (req, res) => {
    const userResponse = req.body.userResponse;
    const apiKey = process.env.OPENROUTER_API_KEY; 

    if (!apiKey) {
        console.error("FATAL ERROR: OPENROUTER_API_KEY is not set in .env file.");
        return res.status(500).json({ error: "Server configuration error: Missing API Key." });
    }

    if (!userResponse) {
        return res.status(400).json({ error: "Missing userResponse" });
    }

    const prompt =` You are an empathetic customer service AI. The user's response is: ${userResponse}. Based on its empathy and tone, provide a constructive critique (aiResponse) and assign a score change (scoreDelta: -10 to +10). Respond only with a clean JSON object with fields: aiResponse (string) and scoreDelta (number).`;

    try {
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: "openai/gpt-3.5-turbo",
            messages: [
                {"role": "user", "content": prompt}
            ],
            response_format: { type: "json_object" } 
        }, {
            headers: {
                'Authorization':` Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const aiResponseText = response.data.choices[0].message.content.trim();
        const aiData = JSON.parse(aiResponseText);

        res.json(aiData);

    } catch (error) {
        if (error.response) {
            console.error("OpenRouter API Error Status:", error.response.status);
            console.error("OpenRouter API Error Data:", error.response.data);
        } else {
            console.error("Network or Parsing Error:", error.message);
        }
        res.status(500).json({ error: "Failed to get AI response from OpenRouter." });
    }
});// Example POST route called when a scenario is completed
app.post('/api/complete-scenario', async (req, res) => {
    // NOTE: You must use express.json() middleware to read req.body
    const newReport = req.body; // Assume req.body contains the new scores and data

    try {
        // 1. Read existing data
        const currentData = await fs.readFile('./scores.json', 'utf8');
        const scores = JSON.parse(currentData);
        
        // 2. Update the data object
        scores.dailyReport = newReport.dailyReport;
        scores.lastScore = newReport.dailyReport.finalScore;
        scores.lastSessionTitle =` ${newReport.sessionName} (${new Date().toLocaleDateString()})`;
        
        // Push the new score to the log
        scores.log.push({ session: newReport.sessionName, score: newReport.dailyReport.finalScore });
        
        // 3. Write the updated data back to the JSON file
        const updatedDataString = JSON.stringify(scores, null, 2); // 'null, 2' for pretty formatting
        await fs.writeFile('./scores.json', updatedDataString);

        res.json({ success: true, message: 'Scores updated successfully.' });

    } catch (error) {
        console.error('Error updating scores:', error);
        res.status(500).json({ success: false, message: 'Failed to update scores.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Ready to process requests from the Empathy Trainer!');
});