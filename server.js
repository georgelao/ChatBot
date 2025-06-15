// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config(); // Load environment variables from .env file

const app = express();
const port = 3000;

// In-memory storage for messages (for simplicity - not persistent across server restarts)
const receivedMessages = [];

// Middleware to enable CORS
app.use(cors());

// Middleware to parse JSON request bodies
app.use(bodyParser.json());

// Serve the static HTML file
// This line makes your index.html accessible directly from the server.
// If you open index.html directly in your browser (file:// path), this line isn't strictly needed for the frontend,
// but it's good practice for a full server setup.
app.use(express.static(__dirname));

// Define the /chat endpoint
app.post('/chat', async (req, res) => {
    const userMessage = req.body.message;

    if (!userMessage) {
        return res.status(400).json({ error: 'Message not provided in request body.' });
    }

    receivedMessages.push({ role: 'user', content: userMessage }); // Store user message
    console.log('Received message:', userMessage);

    try {
        // --- Gemini API Integration ---
        const apiKey = process.env.GEMINI_API_KEY; // Get Gemini API key from environment variables
        if (!apiKey) {
            // If the API key is not set, log an error and return a specific message to the frontend
            console.error("GEMINI_API_KEY is not set in the .env file. Please create or update your .env file.");
            return res.status(500).json({ reply: "Server error: Gemini API key is missing. Please set it in your .env file." });
        }

        // Gemini API endpoint for gemini-2.0-flash model
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        // Construct the payload for the Gemini API call
        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [{ text: userMessage }]
                }
            ]
            // For a multi-turn conversation, you would include prior messages in the 'contents' array here.
            // For this basic example, we are sending only the current user message to Gemini.
        };

        // Make the API call to Gemini
        const response = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            // Attempt to parse error details if response is not ok
            const errorBody = await response.json().catch(() => ({ message: "Could not parse error response" }));
            throw new Error(`Gemini API error! Status: ${response.status}, Details: ${JSON.stringify(errorBody)}`);
        }

        const result = await response.json(); // Parse the JSON response from Gemini

        let chatbotReply = 'No reply received from Gemini.';
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            chatbotReply = result.candidates[0].content.parts[0].text;
        } else {
            console.warn("Unexpected Gemini API response structure:", result);
            chatbotReply = "I received an unexpected response from Gemini. Please try again.";
        }

        receivedMessages.push({ role: 'assistant', content: chatbotReply }); // Store assistant message
        console.log('Chatbot replied:', chatbotReply);

        // Send the chatbot's reply back to the frontend
        res.json({ reply: chatbotReply });

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        // Provide a more user-friendly error message to the frontend
        res.status(500).json({ reply: `Oops! There was an issue connecting to Gemini. Error: ${error.message}` });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
    console.log(`Open http://localhost:${port}/index.html in your browser to use the chatbot.`);
    console.log('IMPORTANT: Ensure your GEMINI_API_KEY is set in a .env file!');
});