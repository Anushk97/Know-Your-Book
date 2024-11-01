const express = require('express');
const axios = require('axios');
const cors = require('cors');
// const { fetchBookReviews, analyzeWordFrequencies } = require('./reviewAnalyzer'); // Import the correct function
require('dotenv').config();
const { LanguageServiceClient } = require('@google-cloud/language');
const { Configuration, OpenAIApi } = require('openai');

// Set the path to your service account key file
process.env.GOOGLE_APPLICATION_CREDENTIALS = '/Users/emmy/Desktop/DL/book_reco_proj/gpt-backend/training-437406-313f78bf5035.json';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

const cache = {};


// Existing chat functionality
app.post('/api/chat', async (req, res) => {
  const { message, book, conversation } = req.body;

  try {
    const prompt = `You are the protagonist of the book "${book}". 
    Continue the story from where it left off, focusing on the next chapter. 
    Provide insights into your thoughts, feelings, and actions as the story unfolds. 
    User's prompt: ${message}`;
    console.log('Prompt sent to OpenAI:', prompt);

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: `You are the protagonist of the book "${book}". Continue the story chapter by chapter. Dive into a chapter in detail if the user wants to.Use emojis to make your responses more visual and interesting. Keep your responses concise and complete it within the token limit. Talk about one chapter at a time. Do not mention which chapter you are on. for example, do not say "Chapter 1: .... and end each message with ...` },
          { role: 'user', content: `Conversation so far: ${JSON.stringify(conversation)}. User's prompt: ${message}` },
        ],
        max_tokens: 300,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        timeout: 10000,
      }
    );

    console.log('OpenAI API response:', response.data);

    const gptResponse = response.data.choices[0].message.content.trim();
    console.log('GPT Response:', gptResponse);
    res.json({ response: gptResponse });
  } catch (error) {
    console.error('Error communicating with OpenAI:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Error communicating with OpenAI' });
  }
});

// New endpoint for fetching and analyzing book reviews
// app.post('/api/reviews', async (req, res) => {
//   const { book } = req.body;
//   console.log('Received request for book:', book);

//   try {
//     const reviews = await fetchBookReviews(book);
//     console.log('Fetched Reviews:', reviews);

//     // Use the analyzeWordFrequencies function
//     const wordFrequencies = await analyzeWordFrequencies(reviews);
//     console.log('Analyzed Word Frequencies:', wordFrequencies);

//     res.json({ wordFrequencies });
//   } catch (error) {
//     console.error('Error processing reviews:', error);
//     res.status(500).json({ error: 'Error processing reviews' });
//   }
// });

// New endpoint for fetching protagonist message
app.post('/api/protagonist-message', async (req, res) => {
  const { book } = req.body;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: `You are the protagonist of the book "${book}". Craft a welcoming message inviting the reader to explore your story and the lessons it holds. Make the message interesting with emojis. Keep it short and concise. Do not start with Welcome! I'm.` },
        ],
        max_tokens: 150,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const gptMessage = response.data.choices[0].message.content.trim();
    res.json({ message: gptMessage });
  } catch (error) {
    console.error('Error generating protagonist message:', error);
    res.status(500).json({ message: 'Error generating message.' });
  }
});

// Updated endpoint for generating follow-up prompts
app.post('/api/generate-prompts', async (req, res) => {
  const { conversation } = req.body;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are the protagonist of the book. Your goal is to guide the reader through your story, chapter by chapter. Based on the current conversation, suggest two follow-up questions that will help the reader understand the key events and themes of the next chapter. Focus on engaging the reader and providing insights into your journey. Do not number the questions.' },
          { role: 'user', content: `Based on this conversation: ${JSON.stringify(conversation)}, suggest some follow-up questions that are interesting to explore the next chapter of your story.` },
        ],
        max_tokens: 100,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    // Process the response to remove any numbering and add "Continue your story"
    const gptPrompts = response.data.choices[0].message.content
      .trim()
      .split('\n')
      .map(prompt => prompt.replace(/^\d+\.\s*|-/, '').trim()) // Remove leading numbers, spaces, and dashes
      .slice(0, 2); // Get only two prompts

    // Add "Continue your story" to the list of prompts
    gptPrompts.push("Continue your story");

    res.json({ prompts: gptPrompts });
  } catch (error) {
    console.error('Error generating prompts:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Error generating prompts' });
  }
});

app.post('/api/similar-books', async (req, res) => {
  const { title } = req.body;

  try {
    const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}&key=${process.env.REACT_APP_GOOGLE_BOOKS_API_KEY}`);
    const similarBooks = response.data.items.map(item => ({
      title: item.volumeInfo.title,
      image: item.volumeInfo.imageLinks?.thumbnail || '',
    }));
    res.json({ similarBooks });
  } catch (error) {
    console.error('Error fetching similar books:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Error fetching similar books' });
  }
});

app.post('/api/identify-category', async (req, res) => {
  const { query } = req.body;

  // Check cache first
  if (cache[query]) {
    return res.json(cache[query]);
  }

  // Extract year from query
  const yearMatch = query.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? yearMatch[0] : null;

  // Extract author from query
  const authorMatch = query.match(/by\s+([a-zA-Z\s]+)/i);
  const author = authorMatch ? authorMatch[1].trim() : null;

  // Validate input length
  const wordCount = query.split(/\s+/).filter(word => word.length > 0).length;
  if (wordCount < 3) {
    return res.status(400).json({ error: 'Input text is too short. Please provide at least 3 words.' });
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a book categorization assistant. Your task is to identify the category of a book based on the user query. There can be multiple categories, only return the category name, no other text.' },
          { role: 'user', content: `Please categorize the following book query: "${query}".` },
        ],
        max_tokens: 50,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const category = response.data.choices[0].message.content.trim();
    cache[query] = { category, year, author }; // Cache the result
    res.json({ category, year, author });
  } catch (error) {
    console.error('Error identifying category:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Error identifying category' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

//////