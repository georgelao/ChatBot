// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
// const OpenAI = require('openai'); // Removed direct OpenAI import
// const Puter = require('puter'); // Removed Puter import
require('dotenv').config(); // Load environment variables from .env file

const app = express();
const port = 3000;

// In-memory storage for messages (for simplicity - not persistent across server restarts)
const receivedMessages = [];

// Middleware to enable CORS
app.use(cors());

// Middleware to parse JSON request bodies
app.use(bodyParser.json());

// Serve the static HTML files
app.use(express.static(__dirname));

// --- Gemini AI Chat Endpoint ---
app.post('/chat', async (req, res) => {
    const userMessage = req.body.message;

    if (!userMessage) {
        return res.status(400).json({ error: 'Message not provided in request body.' });
    }

    receivedMessages.push({ role: 'user', content: userMessage, model: 'Gemini' });
    console.log('Received message for Gemini:', userMessage);

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("GEMINI_API_KEY is not set in the .env file.");
            return res.status(500).json({ reply: "Server error: Gemini API key is missing. Please set it in your .env file." });
        }

        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{ role: "user", parts: [{ text: userMessage }] }]
        };

        const response = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ message: "Could not parse error response" }));
            throw new Error(`Gemini API error! Status: ${response.status}, Details: ${JSON.stringify(errorBody)}`);
        }

        const result = await response.json();
        let chatbotReply = 'No reply received from Gemini.';
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            chatbotReply = result.candidates[0].content.parts[0].text;
        } else {
            console.warn("Unexpected Gemini API response structure:", result);
            chatbotReply = "I received an unexpected response from Gemini. Please try again.";
        }

        receivedMessages.push({ role: 'assistant', content: chatbotReply, model: 'Gemini' });
        console.log('Gemini replied:', chatbotReply);
        res.json({ reply: chatbotReply });

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        res.status(500).json({ reply: `Oops! There was an issue connecting to Gemini. Error: ${error.message}` });
    }
});

// --- Mistral AI Chat Endpoint ---
app.post('/mistral_chat', async (req, res) => {
    const userMessage = req.body.message;

    if (!userMessage) {
        return res.status(400).json({ error: 'Message not provided in request body.' });
    }

    receivedMessages.push({ role: 'user', content: userMessage, model: 'Mistral AI' });
    console.log('Received message for Mistral AI:', userMessage);

    try {
        const apiKey = process.env.MISTRAL_API_KEY;
        if (!apiKey) {
            console.error("MISTRAL_API_KEY is not set in the .env file.");
            return res.status(500).json({ reply: "Server error: Mistral AI API key is missing. Please set it in your .env file." });
        }

        const mistralApiUrl = `https://api.mistral.ai/v1/chat/completions`;
        const payload = {
            model: "mistral-tiny",
            messages: [
                { role: "system", content: "You are a helpful and concise AI assistant powered by Mistral AI." },
                { role: "user", content: userMessage }
            ],
            temperature: 0.7,
            max_tokens: 150,
        };

        const response = await fetch(mistralApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ message: "Could not parse error response" }));
            throw new Error(`Mistral AI API error! Status: ${response.status}, Details: ${JSON.stringify(errorBody)}`);
        }

        const result = await response.json();

        let chatbotReply = 'No reply received from Mistral AI.';
        if (result.choices && result.choices.length > 0 && result.choices[0].message && result.choices[0].message.content) {
            chatbotReply = result.choices[0].message.content;
        } else {
            console.warn("Unexpected Mistral AI API response structure:", result);
            chatbotReply = "I received an unexpected response from Mistral AI. Please try again.";
        }

        receivedMessages.push({ role: 'assistant', content: chatbotReply, model: 'Mistral AI' });
        console.log('Mistral AI replied:', chatbotReply);
        res.json({ reply: chatbotReply });

    } catch (error) {
        console.error('Error calling Mistral AI API:', error);
        res.status(500).json({ reply: `Oops! There was an issue connecting to Mistral AI. Error: ${error.message}` });
    }
});

// --- Groq Chat Endpoint ---
app.post('/groq_chat', async (req, res) => {
    const userMessage = req.body.message;

    if (!userMessage) {
        return res.status(400).json({ error: 'Message not provided in request body.' });
    }

    receivedMessages.push({ role: 'user', content: userMessage, model: 'Groq' });
    console.log('Received message for Groq:', userMessage);

    try {
        const apiKey = process.env.GROQ_API_KEY; // Get Groq API key from environment variables
        if (!apiKey) {
            console.error("GROQ_API_KEY is not set in the .env file.");
            return res.status(500).json({ reply: "Server error: Groq API key is missing. Please set it in your .env file." });
        }

        // Groq API endpoint
        const groqApiUrl = `https://api.groq.com/openai/v1/chat/completions`; // Groq uses OpenAI-compatible endpoint
        const payload = {
            model: "llama3-8b-8192", // Example Groq model. Check Groq documentation for available models.
            messages: [
                { role: "system", content: "You are a blazing fast and efficient AI assistant powered by Groq." },
                { role: "user", content: userMessage }
            ],
            temperature: 0.7,
            max_tokens: 150,
        };

        const response = await fetch(groqApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}` // Authorization header for Groq
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ message: "Could not parse error response" }));
            throw new Error(`Groq API error! Status: ${response.status}, Details: ${JSON.stringify(errorBody)}`);
        }

        const result = await response.json();

        let chatbotReply = 'No reply received from Groq.';
        if (result.choices && result.choices.length > 0 && result.choices[0].message && result.choices[0].message.content) {
            chatbotReply = result.choices[0].message.content;
        } else {
            console.warn("Unexpected Groq API response structure:", result);
            chatbotReply = "I received an unexpected response from Groq. Please try again.";
        }

        receivedMessages.push({ role: 'assistant', content: chatbotReply, model: 'Groq' });
        console.log('Groq replied:', chatbotReply);
        res.json({ reply: chatbotReply });

    } catch (error) {
        console.error('Error calling Groq API:', error);
        res.status(500).json({ reply: `Oops! There was an issue connecting to Groq. Error: ${error.message}` });
    }
});


// Start the server
app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
    console.log(`Open http://localhost:${port}/frontpage.html in your browser to start.`);
    console.log('IMPORTANT: Ensure your GEMINI_API_KEY, MISTRAL_API_KEY, AND GROQ_API_KEY are set in a .env file!');
});