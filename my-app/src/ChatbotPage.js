import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import FollowUpPrompts from './FollowUpPrompts';

const ChatbotPage = ({ book, author, bookAbstract, bookStats, coverUrl, chatHistory, setChatHistory }) => {
  const [chatInput, setChatInput] = useState('');
  const [prompts, setPrompts] = useState(['Tell me more!', 'What happens next?']);
  const protagonistMessageFetched = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [toggleActive, setToggleActive] = useState(location.state?.toggleActive || false);

  useEffect(() => {
    const fetchProtagonistMessage = async () => {
      try {
        const response = await axios.post('http://localhost:5001/api/protagonist-message', { book });
        const protagonistMessage = response.data.message;

        setChatHistory((prevHistory) => [
          ...prevHistory,
          { sender: 'protagonist', message: protagonistMessage },
        ]);
        protagonistMessageFetched.current = true;
      } catch (error) {
        console.error('Error fetching protagonist message:', error);
      }
    };

    if (book && !protagonistMessageFetched.current) {
      fetchProtagonistMessage();
    }
  }, [book, setChatHistory]);

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      const updatedChatHistory = [...chatHistory, { sender: 'user', message: chatInput }];

      setChatHistory(updatedChatHistory);

      try {
        const response = await axios.post('http://localhost:5001/api/chat', { message: chatInput, book, author, bookAbstract, bookStats, coverUrl });
        const gptResponse = response.data.response;

        setChatHistory((prevHistory) => [
          ...prevHistory,
          { sender: 'gpt', message: gptResponse },
        ]);

        const promptResponse = await axios.post('http://localhost:5001/api/generate-prompts', { conversation: updatedChatHistory });
        const generatedPrompts = promptResponse.data.prompts;

        setPrompts(generatedPrompts);
      } catch (error) {
        console.error('Error fetching GPT response:', error);
      }

      setChatInput('');
    }
  };

  const handlePromptClick = async (prompt) => {
    if (prompt.trim()) {
      const updatedChatHistory = [...chatHistory, { sender: 'user', message: prompt }];

      setChatHistory(updatedChatHistory);

      try {
        const response = await axios.post('http://localhost:5001/api/chat', { message: prompt, book, author, bookAbstract, bookStats, coverUrl });
        const gptResponse = response.data.response;

        setChatHistory((prevHistory) => [
          ...prevHistory,
          { sender: 'gpt', message: gptResponse },
        ]);

        const promptResponse = await axios.post('http://localhost:5001/api/generate-prompts', { conversation: updatedChatHistory });
        const generatedPrompts = promptResponse.data.prompts;

        setPrompts(generatedPrompts);
      } catch (error) {
        console.error('Error fetching GPT response:', error);
      }
    }
  };

  const handleToggle = () => {
    setToggleActive(!toggleActive);
    navigate('/', { state: { toggleActive: !toggleActive } });
  };

  return (
    <div className="chatbot-page">
      <div className="chat-container">
        <div className={`toggle-switch ${toggleActive ? 'active' : ''}`} onClick={handleToggle}></div>
        <h3>Know your book</h3>
        <div className="chat-history">
          {chatHistory.map((chat, index) => (
            <div key={index} className={`chat-message ${chat.sender}`}>
              {chat.message}
            </div>
          ))}
        </div>
        <form onSubmit={handleChatSubmit}>
          <input 
            type="text" 
            placeholder="Ask something..." 
            value={chatInput} 
            onChange={(e) => setChatInput(e.target.value)} 
            className="chat-input"
          />
        </form>
        <div className="prompt-suggestions">
          <FollowUpPrompts prompts={prompts} onPromptClick={handlePromptClick} />
        </div>
      </div>
    </div>
  );
};

export default ChatbotPage;
