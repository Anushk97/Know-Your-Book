import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import ChatbotPage from './ChatbotPage';
import MainPage from './MainPage';

const App = () => {
  const [book, setBook] = useState('');
  const [author, setAuthor] = useState('');
  const [bookAbstract, setBookAbstract] = useState('');
  const [bookStats, setBookStats] = useState({ pages: 1268, wordsPerPage: 250 });
  const [coverUrl, setCoverUrl] = useState('');
  const [protagonistMessage, setProtagonistMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [latestBooks, setLatestBooks] = useState([]);
  const [identifiedCategory, setIdentifiedCategory] = useState('');
  const [searchHistory, setSearchHistory] = useState([]);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/chatbot" 
            element={
              <ChatbotPage 
                book={book} 
                author={author} 
                bookAbstract={bookAbstract} 
                bookStats={bookStats} 
                coverUrl={coverUrl} 
                protagonistMessage={protagonistMessage} 
                chatHistory={chatHistory} 
                setChatHistory={setChatHistory}
              />
            } 
          />
          <Route 
            path="/" 
            element={
              <MainPage 
                setBook={setBook} 
                setAuthor={setAuthor} 
                setBookAbstract={setBookAbstract} 
                setBookStats={setBookStats} 
                setCoverUrl={setCoverUrl} 
                setProtagonistMessage={setProtagonistMessage} 
                setChatHistory={setChatHistory} // Pass setter to reset chat history
                latestBooks={latestBooks} 
                setLatestBooks={setLatestBooks} 
                identifiedCategory={identifiedCategory} 
                setIdentifiedCategory={setIdentifiedCategory}
                searchHistory={searchHistory} 
                setSearchHistory={setSearchHistory}
              />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
