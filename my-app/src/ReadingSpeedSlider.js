// ReadingSpeedSlider.js
import React from 'react';

const ReadingSpeedSlider = ({ speed, setSpeed }) => {
  return (
    <div className="reading-speed-slider">
      <label htmlFor="speed">Reading Speed: {speed} words per minute</label>
      <input
        type="range"
        id="speed"
        min="10"
        max="500"
        value={speed}
        onChange={(e) => setSpeed(e.target.value)}
      />
    </div>
  );
};

export default ReadingSpeedSlider;