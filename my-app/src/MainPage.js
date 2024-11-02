import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { FaGoodreads, FaAmazon } from 'react-icons/fa';
import { SiAdobe } from 'react-icons/si';
import { useNavigate } from 'react-router-dom';

const MainPage = ({ setBook, setAuthor, setBookAbstract, setBookStats, setCoverUrl, setProtagonistMessage, setChatHistory }) => {
  // const [book, setBookLocal] = useState('');
  // const [author, setAuthorLocal] = useState('');
  // const [bookAbstract, setBookAbstractLocal] = useState('');
  // const [bookStats, setBookStatsLocal] = useState({ pages: 1268, wordsPerPage: 250 });
  // const [coverUrl, setCoverUrlLocal] = useState('');
  const [latestBooks, setLatestBooks] = useState([]);
  const [identifiedCategory, setIdentifiedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [userMessage, setUserMessage] = useState('');
  const [startIndex, setStartIndex] = useState(0);
  const navigate = useNavigate();
  const [followUpPrompts, setFollowUpPrompts] = useState([]);
  const [filter, setFilter] = useState('relevance');
  const [error, setError] = useState(null);

  const debounce = (func, wait) => {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  };

  const fetchCategoryAndBooks = async (query, startIndex = 0) => {
    if (!query.trim()) {
      setError('Please enter a valid search query.');
      return;
    }
  
    try {
      setError(null); // Reset error state before fetching
  
      // Use a CORS proxy
      const corsProxy = 'https://cors-anywhere.herokuapp.com/';
      const prhResponse = await axios.get(`${corsProxy}https://api.penguinrandomhouse.com/resources/search?q=${encodeURIComponent(query)}`);
      const prhBooks = prhResponse.data.results.map(item => ({
        title: item.name,
        author: item.author ? item.author.join(', ') : 'Unknown',
        abstract: item.description ? item.description.join(' ') : 'No description available.',
        coverUrl: item.imageUrl || '',
      }));
  
      // Fetch books from Google Books API
      const requestUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&orderBy=${filter}&printType=books&langRestrict=en&startIndex=${startIndex}&maxResults=20&key=${process.env.REACT_APP_GOOGLE_BOOKS_API_KEY}`;
      const booksResponse = await axios.get(requestUrl);
      const googleBooks = booksResponse.data.items.map(item => ({
        title: item.volumeInfo.title,
        author: item.volumeInfo.authors ? item.volumeInfo.authors.join(', ') : 'Unknown',
        pages: item.volumeInfo.pageCount || 'N/A',
        abstract: item.volumeInfo.description || 'No description available.',
        coverUrl: item.volumeInfo.imageLinks?.thumbnail || '',
      }));
  
      // Combine results from both APIs
      const combinedBooks = [...prhBooks, ...googleBooks];
      setLatestBooks(prevBooks => startIndex === 0 ? combinedBooks : [...prevBooks, ...combinedBooks]);
  
      // Set a timeout to check for results after 10 seconds
      setTimeout(() => {
        if (startIndex === 0 && combinedBooks.length === 0) {
          setError('No results found. Please try a different query.');
        }
      }, 10000);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        setError('Bad Request: Please check your query and try again with at least 3 words.');
      } else {
        console.error('Error fetching category or books:', error.response ? error.response.data : error.message);
        setError('There was an error fetching the books. Please try a different query.');
      }
    }
  };

  const fetchCategoryAndBooksDebounced = useCallback(debounce(fetchCategoryAndBooks, 500), []);

  const handleSearch = () => {
    setLatestBooks([]); // Reset the book grid
    setStartIndex(0);
    fetchCategoryAndBooks(searchQuery);
  };

  const handleBookClick = (book) => {
    if (selectedBook === book) {
      setSelectedBook(null); // Deselect if the same book is clicked again
    } else {
      setSelectedBook(book); // Select the book
      setChatMessages([]); // Reset chat messages
      setFollowUpPrompts(["What is this book about?"]); // Set initial prompt
    }
  };

  const handleSendMessage = async () => {
    if (!userMessage.trim()) return;

    const newMessage = { role: 'user', content: userMessage };
    const updatedChatMessages = [...chatMessages, newMessage];
    
    // Update chat state and clear the input field
    setChatMessages(updatedChatMessages);
    setUserMessage('');

    try {
        // Send message to OpenAI Chat API
        const botMessage = await fetchChatCompletion(userMessage, selectedBook.title, updatedChatMessages);

        // Update chat state with bot's response
        const newChatMessages = [...updatedChatMessages, botMessage];
        setChatMessages(newChatMessages);

        // Fetch follow-up prompts based on updated conversation
        const followUpPrompts = await fetchFollowUpPrompts(newChatMessages);
        setFollowUpPrompts(followUpPrompts);

    } catch (error) {
        console.error('Error handling send message:', error.response ? error.response.data : error.message);
        alert('There was an issue processing your request. Please try again later.');
    }
};

// Helper function to call chat completion API
// Adjusted `fetchChatCompletion` to use dynamic token-based truncation
const fetchChatCompletion = async (message, book, conversation) => {
  try {
      const response = await axios.post('https://know-your-book.vercel.app/api/chat', {
          message,
          book,
          conversation,
      }, {
          timeout: 20000, // Increased timeout to 20 seconds
      });

      const botMessage = { role: 'bot', content: response.data.response };
      return botMessage;
  } catch (error) {
      console.error('Error communicating with OpenAI Chat API:', error.response ? error.response.data : error.message);

      // Retry with conversation trimming for token limits or server errors
      if (error.code === 'ECONNABORTED' || error.response?.status >= 500) {
          console.warn('Retrying with token-limited conversation...');
          return retryFetchChatCompletion(message, book, conversation, 8192); // Assuming GPT-4 8k context limit
      }

      throw new Error('Failed to fetch chat completion');
  }
};

// Retry function with conversation management
const retryFetchChatCompletion = async (message, book, conversation, tokenLimit, retries = 2) => {
  for (let attempt = 0; attempt < retries; attempt++) {
      try {
          const adjustedConversation = adjustConversationLength(conversation, tokenLimit);

          const response = await axios.post('https://know-your-book.vercel.app/api/chat', {
              message,
              book,
              conversation: adjustedConversation,
          }, {
              timeout: 20000,
          });

          const botMessage = { role: 'bot', content: response.data.response };
          return botMessage;
      } catch (error) {
          if (attempt === retries - 1) {
              console.error('Failed after retries:', error.response ? error.response.data : error.message);
              throw error; // Throw if all retries fail
          }
          console.warn(`Retry attempt ${attempt + 1} failed. Retrying...`);
      }
  }
};

// Adjusted `fetchFollowUpPrompts` with token-limited truncation
const fetchFollowUpPrompts = async (conversation) => {
  try {
      const response = await axios.post('https://know-your-book.vercel.app/api/generate-prompts', {
          conversation,
      }, {
          timeout: 10000,
      });

      return response.data.prompts;
  } catch (error) {
      console.error('Error fetching follow-up prompts:', error.response ? error.response.data : error.message);

      // Retry with conversation trimming for server errors or token issues
      if (error.code === 'ECONNABORTED' || error.response?.status >= 500) {
          console.warn('Retrying follow-up prompts request with token-limited conversation...');
          return retryFetchFollowUpPrompts(conversation, 8192); // Assuming GPT-4 8k context limit
      }

      throw new Error('Failed to fetch follow-up prompts');
  }
};

// Retry function with conversation management for follow-up prompts
const retryFetchFollowUpPrompts = async (conversation, tokenLimit, retries = 2) => {
  for (let attempt = 0; attempt < retries; attempt++) {
      try {
          const adjustedConversation = adjustConversationLength(conversation, tokenLimit);

          const response = await axios.post('https://know-your-book.vercel.app/api/generate-prompts', {
              conversation: adjustedConversation,
          }, {
              timeout: 10000,
          });

          return response.data.prompts;
      } catch (error) {
          if (attempt === retries - 1) {
              console.error('Failed after retries for follow-up prompts:', error.response ? error.response.data : error.message);
              throw error;
          }
          console.warn(`Retry attempt ${attempt + 1} for follow-up prompts failed. Retrying...`);
      }
  }
};

// Helper function to adjust conversation length
// Approximate function to estimate token count based on word count
const estimateTokenCount = (text) => {
  return Math.ceil(text.split(/\s+/).length * 1.33); // Estimate: 1 word ≈ 1.33 tokens
};

// Helper function to adjust conversation length based on token limit
const adjustConversationLength = (conversation, modelTokenLimit = 8192) => {
  let totalTokens = 0;
  const trimmedConversation = [];

  // Start from the end of the conversation and add messages until the limit is reached
  for (let i = conversation.length - 1; i >= 0; i--) {
      const message = conversation[i];
      const messageTokenCount = estimateTokenCount(message.content);

      // Check if adding this message would exceed the token limit
      if (totalTokens + messageTokenCount > modelTokenLimit) break;

      // Prepend message to maintain original order
      trimmedConversation.unshift(message);
      totalTokens += messageTokenCount;
  }

  return trimmedConversation;
};

  const toggleChatbot = () => {
    setShowChatbot(!showChatbot);
  };

  const loadMoreBooks = () => {
    const newStartIndex = startIndex + 20;
    setStartIndex(newStartIndex);
    fetchCategoryAndBooks(searchQuery, newStartIndex);
  };

  const handleFilterChange = (event) => {
    setFilter(event.target.value);
    setLatestBooks([]); // Reset the book grid
    setStartIndex(0);
    fetchCategoryAndBooks(searchQuery);
  };

  return (
    <div className="App">
      <div className="left-panel">
        <h1 className="search-title">Discover your next great read!</h1>
        <div className="search-bar">
          <input 
            type="text" 
            placeholder="Search for a book..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()} // Trigger search on Enter
          />
          <button className="search-bar button" onClick={handleSearch}>Search</button>
          <select className="filter-select" value={filter} onChange={handleFilterChange}>
            <option value="relevance">Relevance</option>
            <option value="newest">Newest</option>
          </select>
        </div>
        {error && <div className="error-message">{error}</div>}
        <div className="book-grid-container">
          <div className="book-grid">
            {latestBooks.map((book, index) => (
              <div key={index} className="book-item" onClick={() => handleBookClick(book)}>
                {selectedBook === book ? (
                  <div className="abstract-container" style={{ display: selectedBook === book ? 'block' : 'none' }}>
                    <h3>{book.title}</h3>
                    <p>{book.abstract}</p>
                  </div>
                ) : (
                  <img src={book.coverUrl || './no-image.png'} alt={book.title} />
                )}
                <div className="icon-links">
                  <a href={`https://www.goodreads.com/search?q=${encodeURIComponent(book.title)}`} target="_blank" rel="noopener noreferrer">
                    <FaGoodreads />
                  </a>
                  <a href={`https://www.amazon.com/s?k=${encodeURIComponent(book.title)}`} target="_blank" rel="noopener noreferrer">
                    <FaAmazon />
                  </a>
                  <a href={`https://annas-archive.org/search?q=${encodeURIComponent(book.title)}`} target="_blank" rel="noopener noreferrer">
                    <SiAdobe />
                  </a>
                </div>
              </div>
            ))}
            {searchQuery && latestBooks.length > 0 && (
              <button className="load-more-button" onClick={loadMoreBooks}>Load More</button>
            )}
          </div>
        </div>
      </div>
      {/* About the Creator Link */}
      <a
        href="https://www.linkedin.com/in/anushkfarkiya/"
        target="_blank"
        rel="noopener noreferrer"
        className="creator-link"
      >
        About the Creator
      </a>

      {/* Chatbot Button */}
      <button className="chatbot-button" onClick={toggleChatbot}>💬</button>

      {/* Chatbot Window */}
      <div className="chatbot" style={{ display: showChatbot ? 'flex' : 'none' }}>
        <div className="chatbot-header" onClick={toggleChatbot}>
          Dive into the book
        </div>
        <div className="chat-messages">
          {chatMessages.map((msg, index) => (
            <div key={index} className={msg.role}>
              {msg.content}
            </div>
          ))}
        </div>
        <div className="chat-input">
          <input
            type="text"
            placeholder="Input your message here..."
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button className="send-button" onClick={handleSendMessage}>Send</button>
        </div>
        <div className="follow-up-prompts">
          {followUpPrompts.map((prompt, index) => (
            <button key={index} onClick={() => setUserMessage(prompt)}>
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MainPage;

/////////?????