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
      const categoryResponse = await axios.post('https://know-your-book.vercel.app/api/identify-category', { query });
      const { category, year, author } = categoryResponse.data;
      setIdentifiedCategory(category);

      let queryString = `${encodeURIComponent(query)}`;
      if (category) {
        queryString += `+subject:${encodeURIComponent(category)}`;
      }
      if (year) {
        queryString += `+after:${year}`;
      }
      if (author) {
        queryString += `+inauthor:${encodeURIComponent(author)}`;
      }

      const requestUrl = `https://www.googleapis.com/books/v1/volumes?q=${queryString}&orderBy=${filter}&printType=books&langRestrict=en&startIndex=${startIndex}&maxResults=20&key=${process.env.REACT_APP_GOOGLE_BOOKS_API_KEY}`;
      console.log('Request URL:', requestUrl); // Log the request URL

      const booksResponse = await axios.get(requestUrl);
      
      const items = booksResponse.data.items || [];
      const books = items.map(item => ({
        title: item.volumeInfo.title,
        author: item.volumeInfo.authors ? item.volumeInfo.authors.join(', ') : 'Unknown',
        pages: item.volumeInfo.pageCount || 'N/A',
        abstract: item.volumeInfo.description || 'No description available.',
        coverUrl: item.volumeInfo.imageLinks?.thumbnail || '',
      }));
      
      setLatestBooks(prevBooks => startIndex === 0 ? books : [...prevBooks, ...books]);

      // Set a timeout to check for results after 10 seconds
      setTimeout(() => {
        if (startIndex === 0 && books.length === 0) {
          setError('No results found. Please try a different query.');
        }
      }, 10000);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        setError('Bad Request: Please check your query and try again with atleast 3 words.');
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
      setFollowUpPrompts([]); // Reset follow-up prompts
    }
  };

  const handleSendMessage = async () => {
    if (!userMessage.trim()) return;

    const newMessage = { role: 'user', content: userMessage };
    setChatMessages([...chatMessages, newMessage]);
    setUserMessage('');

    try {
      const response = await axios.post('https://know-your-book.vercel.app/api/chat', {
        message: userMessage,
        book: selectedBook.title,
        conversation: chatMessages,
      });

      const botMessage = { role: 'bot', content: response.data.response };
      setChatMessages([...chatMessages, newMessage, botMessage]);

      // Fetch follow-up prompts
      const promptsResponse = await axios.post('https://know-your-book.vercel.app/api/generate-prompts', {
        conversation: [...chatMessages, newMessage, botMessage],
      });

      setFollowUpPrompts(promptsResponse.data.prompts);
    } catch (error) {
      console.error('Error sending message:', error.message);
    }
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
        href="https://www.linkedin.com/in/your-linkedin-profile" // Replace with your LinkedIn URL
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
            placeholder="What is this book about?"
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

/////////????