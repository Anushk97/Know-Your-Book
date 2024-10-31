import React, { useState, useEffect } from 'react';

const fetchBookCover = async (title, author) => {
  try {
    if (!title || !author) {
      console.error('Title or author is missing');
      return null;
    }
    const response = await fetch(`https://bookcover.longitood.com/bookcover?book_title=${encodeURIComponent(title)}&author_name=${encodeURIComponent(author)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Error fetching book cover:', error);
    return null;
  }
};

const BookDetails = ({ title, author, abstract }) => {
  const [coverUrl, setCoverUrl] = useState('');

  useEffect(() => {
    const getCover = async () => {
      if (title && author) {
        const url = await fetchBookCover(title, author);
        setCoverUrl(url);
      }
    };
    getCover();
  }, [title, author]);

  return (
    <div className="book-details">
      <div className="cover-and-abstract">
        {coverUrl && <img src={coverUrl} alt={`${title} cover`} className="book-cover" />}
        <div className="abstract-container">
          <h3>Book Abstract</h3>
          <p>{abstract}</p>
        </div>
      </div>
    </div>
  );
};

export default BookDetails;