require('dotenv').config();

const axios = require('axios');
const Sentiment = require('sentiment');
const sentiment = new Sentiment();

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function fetchBookReviews(bookTitle) {
  console.log('Fetching book information for:', bookTitle);
  const apiKey = process.env.REACT_APP_GOOGLE_BOOKS_API_KEY; // Use environment variable
  const url = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(bookTitle)}&key=${apiKey}`;

  try {
    const response = await axios.get(url);
    console.log('Full Google Books API Response:', response.data);

    // Extract descriptions or other relevant information
    const reviews = response.data.items.map(item => item.volumeInfo.description || 'No description available');
    console.log('Extracted Descriptions:', reviews);
    return reviews;
  } catch (error) {
    console.error('Error fetching book information:', error);
    return [];
  }
}

async function analyzeWordFrequencies(reviews) {
  const wordFrequency = {};
  console.log('Reviews to analyze:', reviews);

  // Combine all reviews into a single string
  const combinedReviews = reviews.join(' ');
  console.log('Combined Reviews:', combinedReviews);

  // Define a set of common stop words to exclude
  const stopWords = new Set([
    'the', 'it', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'with', 'as', 'for', 'on', 'at', 'by', 'an', 'be', 'this', 'which', 'or', 'from', 'but', 'not', 'are', 'was', 'were', 'has', 'have', 'had', 'will', 'would', 'can', 'could', 'should', 'shall', 'may', 'might', 'must', 'do', 'does', 'did', 'done', 'so', 'if', 'then', 'than', 'when', 'where', 'who', 'whom', 'whose', 'why', 'how', 'what', 'all', 'any', 'some', 'no', 'nor', 'only', 'own', 'same', 'such', 'too', 'very', 's', 't', 'd', 'll', 'm', 'o', 're', 've', 'y', 'ain', 'aren', 'couldn', 'didn', 'doesn', 'don', 'hadn', 'hasn', 'haven', 'isn', 'ma', 'mightn', 'mustn', 'needn', 'shan', 'shouldn', 'wasn', 'weren', 'won', 'wouldn'
  ]);

  // Split the combined reviews into words and count each word
  combinedReviews.split(/\s+/).forEach((word) => {
    const cleanedWord = word.toLowerCase().replace(/[^a-z0-9]/g, ''); // Convert to lowercase and remove non-alphanumeric characters
    if (cleanedWord && !stopWords.has(cleanedWord)) {
      wordFrequency[cleanedWord] = (wordFrequency[cleanedWord] || 0) + 1;
    }
  });

  // Convert the word frequency object to an array
  const wordArray = Object.entries(wordFrequency).map(([text, value]) => ({ text, value }));

  // Shuffle the array
  const shuffledWords = shuffleArray(wordArray);

  console.log('Shuffled Word Frequencies:', shuffledWords);
  return shuffledWords;
}

// Test the function with a specific book title
(async () => {
  const bookTitle = 'Dune'; // Replace with the book title you want to test
  const reviews = await fetchBookReviews(bookTitle);
  if (reviews.length > 0) {
    const wordFrequencies = await analyzeWordFrequencies(reviews);
    console.log('Word Frequencies from Reviews:', wordFrequencies);
  } else {
    console.log('No reviews found for this book.');
  }
})();

module.exports = { fetchBookReviews, analyzeWordFrequencies };
