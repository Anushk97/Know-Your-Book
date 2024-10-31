// FollowUpPrompts.js
import React from 'react';
import './FollowUpPrompts.css';

const FollowUpPrompts = ({ prompts, onPromptClick }) => {
  return (
    <div className="follow-up-prompts">
      {prompts.map((prompt, index) => (
        <button key={index} onClick={() => onPromptClick(prompt)}>
          {prompt}
        </button>
      ))}
    </div>
  );
};

export default FollowUpPrompts;