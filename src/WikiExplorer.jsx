import React, { useState, useCallback, useMemo, useEffect } from 'react';

// Base URL for the Wikipedia MediaWiki Action API
const WIKI_API_BASE = 'https://en.wikipedia.org/w/api.php';

/**
 * Main application component for the Wiki Explorer.
 * It handles search, result display, and article viewing using the Wikipedia API.
 */
const App = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  // State for Light/Dark Mode. Default is false (light mode).
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // States for Dynamic Placeholder
  const [currentSuggestion, setCurrentSuggestion] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  // New state to control the fade animation
  const [isSuggestionVisible, setIsSuggestionVisible] = useState(true); 

  // --- PERSISTENCE: LOAD DARK MODE PREFERENCE ---
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('wikiExplorerDarkMode');
      if (savedMode !== null) {
        // localStorage stores strings, so convert 'true'/'false' to boolean
        setIsDarkMode(savedMode === 'true');
      } else if (window.matchMedia) {
        // Fallback: Use system preference if no explicit setting is saved
        setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
      }
    } catch (e) {
      console.error("Could not load dark mode preference from localStorage:", e);
    }
  }, []); // Run only once on mount

  // --- PERSISTENCE: SAVE DARK MODE PREFERENCE ---
  useEffect(() => {
    try {
      // Save the current state whenever it changes
      localStorage.setItem('wikiExplorerDarkMode', isDarkMode);
    } catch (e) {
      console.error("Could not save dark mode preference to localStorage:", e);
    }
  }, [isDarkMode]); // Run whenever isDarkMode changes

  // List of search suggestions
  const suggestions = useMemo(() => [
      "The history of React Hooks",
      "Explain quantum computing simply",
      "Who invented the first battery?",
      "What is the principle of relativity?",
      "The life cycle of a star",
      "Search for a great recipe",
      "Interesting facts about Jupiter",
  ], []);

  // Effect to cycle through suggestions every 5 seconds with a cross-fade
  useEffect(() => {
    // Initialize with a random suggestion
    setCurrentSuggestion(suggestions[Math.floor(Math.random() * suggestions.length)]);
    setIsSuggestionVisible(true);
    
    const cycleTime = 5000; // Total time for one suggestion (including fade)
    const fadeDuration = 500; // Fade in/out duration

    const intervalId = setInterval(() => {
      // 1. Start fade out
      setIsSuggestionVisible(false);

      // 2. Wait for fade out to complete (500ms), then update content and fade in
      const timeoutId = setTimeout(() => {
        // Update to the next suggestion
        setCurrentSuggestion(prevSuggestion => {
          const currentIndex = suggestions.indexOf(prevSuggestion);
          // Find next index, wrapping around to the start of the array
          const nextIndex = (currentIndex + 1) % suggestions.length;
          return suggestions[nextIndex];
        });
        // 3. Fade back in
        setIsSuggestionVisible(true);
      }, fadeDuration);

      return () => clearTimeout(timeoutId); // Cleanup inner timeout on cycle clear

    }, cycleTime); // Cycle restarts every 5 seconds

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, [suggestions]);

  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => !prevMode);
  };
  
  // Generate a random background URL once on component mount
  const randomBackgroundUrl = useMemo(() => {
    // Generate a random number to ensure a new image on refresh
    const randomNumber = Math.floor(Math.random() * 1000); 
    // Use a large size for bg-cover and a different image on each load
    return `url(https://picsum.photos/1920/1080?random=${randomNumber})`;
  }, []);

  // Define common background and text colors based on mode
  const modeClasses = {
    // Global text color for elements not inside cards
    globalTextColor: isDarkMode ? 'text-gray-100' : 'text-gray-900',
    // Content Card background: opaque/translucent with blur
    cardBg: isDarkMode ? 'bg-gray-800/90 backdrop-blur-sm' : 'bg-white/90 backdrop-blur-sm',
    inputBg: isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300',
    titleColor: isDarkMode ? 'text-indigo-400' : 'text-indigo-600',
    buttonHover: isDarkMode ? 'hover:bg-indigo-600' : 'hover:bg-indigo-700',
    textMuted: isDarkMode ? 'text-gray-400' : 'text-gray-500',
    resultItem: isDarkMode 
      ? 'bg-gray-700/80 border-gray-600 hover:shadow-lg hover:ring-indigo-400'
      : 'bg-white/70 border-gray-200 hover:shadow-xl hover:ring-indigo-500',
    resultTitle: isDarkMode ? 'text-indigo-300' : 'text-indigo-700',
    resultSnippet: isDarkMode ? 'text-gray-300' : 'text-gray-600',
    loadingBg: isDarkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-50 text-indigo-700',
    errorBg: isDarkMode ? 'bg-red-900/50 text-red-300 border-red-600' : 'bg-red-100 text-red-700 border-red-400',
  };


  // Function to handle the initial search query
  const handleSearch = useCallback(async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setHasSearched(true); // Mark that a search has been performed
    setLoading(true);
    setResults([]);
    setSelectedArticle(null);
    setError(null);

    const params = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: searchTerm,
      format: 'json',
      // Required for cross-origin requests
      origin: '*', 
      srlimit: 10,
    });

    try {
      const response = await fetch(`${WIKI_API_BASE}?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.info);
      }

      const searchResults = data.query?.search || [];
      setResults(searchResults);
      if (searchResults.length === 0) {
        setError(`No results found for "${searchTerm}"`);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to fetch search results from Wikipedia.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  // Function to fetch the detailed extract of a specific article by title
  const fetchArticleExtract = useCallback(async (title) => {
    setSelectedArticle(null);
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      action: 'query',
      prop: 'extracts',
      titles: title,
      explaintext: true, // Get plain text content
      exintro: true, // Get only the introduction section
      format: 'json',
      origin: '*',
      formatversion: 2, // Simplify the response structure
      exlimit: 1,
    });

    try {
      const response = await fetch(`${WIKI_API_BASE}?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      
      const page = data.query?.pages?.[0];
      if (page && page.extract) {
        setSelectedArticle({
          title: page.title,
          content: page.extract,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
        });
      } else {
        setError(`Could not retrieve full article content for ${title}.`);
      }
    } catch (err) {
      console.error('Article fetch error:', err);
      setError('Failed to load article content.');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearArticle = () => {
    setSelectedArticle(null);
  };

  // Determine the placeholder text for the actual input field
  const inputPlaceholderText = useMemo(() => {
    if (hasSearched) return "Search for articles again...";
    // If we are showing the custom suggestion overlay, the input placeholder should be empty
    return ''; 
  }, [hasSearched]);


  const MemoizedSearchResults = useMemo(() => (
    <div className="space-y-4">
      {results.map((result) => (
        <button
          key={result.pageid}
          onClick={() => fetchArticleExtract(result.title)}
          className={`w-full text-left p-4 rounded-xl shadow-lg border transition duration-300 transform hover:scale-[1.01] ${modeClasses.resultItem}`}
        >
          <h3 className={`text-xl font-semibold mb-1 ${modeClasses.resultTitle}`}>{result.title}</h3>
          {/* dangerouslySetInnerHTML is used here because Wikipedia returns HTML snippets */}
          <p className={`text-sm ${modeClasses.resultSnippet}`} dangerouslySetInnerHTML={{ __html: result.snippet }} />
        </button>
      ))}
    </div>
  ), [results, fetchArticleExtract, modeClasses]);

  const MemoizedArticleView = useMemo(() => {
    if (!selectedArticle) return null;
    return (
      <div className={`p-6 border rounded-2xl shadow-2xl relative ${modeClasses.cardBg} ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <button
          onClick={clearArticle}
          className={`absolute top-3 right-3 p-2 transition duration-150 ${isDarkMode ? 'text-gray-400 hover:text-gray-100' : 'text-gray-400 hover:text-gray-700'}`}
          aria-label="Close article view"
        >
          {/* Close Icon (X) */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className={`text-3xl font-bold mb-4 border-b pb-2 ${isDarkMode ? 'text-white border-gray-600' : 'text-gray-800 border-gray-200'}`}>{selectedArticle.title}</h2>
        <div className={`whitespace-pre-wrap leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {selectedArticle.content}
        </div>
        <a 
          href={selectedArticle.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="mt-6 inline-block text-indigo-500 hover:text-indigo-400 font-medium transition duration-150"
        >
          Read the full article on Wikipedia &rarr;
        </a>
      </div>
    );
  }, [selectedArticle, isDarkMode, modeClasses]);

  return (
    // Outer div for fixed background image
    <div 
        className="min-h-screen font-sans antialiased relative"
        style={{ 
            backgroundImage: randomBackgroundUrl, 
            backgroundAttachment: 'fixed', 
            backgroundSize: 'cover',
            backgroundPosition: 'center', 
        }}
    >
      {/* Load Google Font and define custom animation */}
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet" />
      <style>
        {`
        /* Define Y-axis rotation and hold */
        @keyframes rotateYspin {
          0% {
            transform: rotateY(0deg);
          }
          11.11% { /* 1 second of rotation (1/9 * 100) */
            transform: rotateY(360deg);
          }
          100% {
            /* Hold rotation at 360deg for the rest of the 9s cycle */
            transform: rotateY(360deg); 
          }
        }
        .rotating-title {
          /* Apply the animation: 9 seconds total cycle time, linear speed, infinite loop */
          animation: rotateYspin 9s linear infinite;
          display: inline-block; 
          transform-style: preserve-3d;
        }
        `}
      </style>
      <script src="https://cdn.tailwindcss.com"></script>

      {/* 1. Backdrop/Overlay for blur, color tint, and dark/light mode transition */}
      <div className={`absolute inset-0 z-0 transition-colors duration-500 ${isDarkMode ? 'bg-gray-900/85 backdrop-blur-md' : 'bg-gray-50/80 backdrop-blur-md'}`}></div>
      
      {/* 2. Content wrapper: holds all application UI elements */}
      <div className={`relative z-10 max-w-4xl mx-auto min-h-screen flex flex-col p-4 sm:p-8 ${modeClasses.globalTextColor}`}>
        
        {/* Header and Dark Mode Toggle */}
        <header className="text-center mb-10 relative">
          <button
            onClick={toggleDarkMode}
            className={`absolute top-0 right-0 p-3 rounded-full transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 text-yellow-300 hover:bg-gray-700' : 'bg-white text-indigo-600 hover:bg-gray-100'}`}
            aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? (
              // Sun Icon (Light Mode)
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            ) : (
              // Moon Icon (Dark Mode)
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            )}
          </button>

          {/* Dynamic Title with 'Bebas Neue' font and rotation applied to the span */}
          <h1 className="text-7xl font-normal tracking-wider leading-none" style={{ fontFamily: '"Bebas Neue", sans-serif' }}>
            <span className={`${modeClasses.titleColor} rotating-title`}>Wiki Explorer</span>
          </h1>
          <p className={`mt-3 text-xl ${modeClasses.textMuted}`}>
            Search Wikipedia and fetch quick summaries using the official MediaWiki API.
          </p>
        </header>

        {/* Search Form */}
        <form onSubmit={handleSearch} className={`mb-8 p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 ${modeClasses.cardBg}`}>
          
          {/* Input Field and Dynamic Placeholder Wrapper */}
          <div className="relative flex-grow">
            
            {/* Dynamic Suggestion Overlay (visible only when search term is empty and first search hasn't occurred) */}
            {/* This element handles the cross-fade effect */}
            {!searchTerm && !hasSearched && (
                <div 
                  className={`absolute top-0 left-0 h-full flex items-center px-4 pointer-events-none transition-opacity duration-500`}
                  style={{ 
                    opacity: isSuggestionVisible ? 1 : 0, 
                  }}
                >
                  <span className={`text-lg placeholder-gray-400 ${modeClasses.textMuted}`}>
                      {currentSuggestion}
                  </span>
                </div>
            )}

            {/* Actual Input */}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              // Use standard placeholder for "Search again" or if user has started typing (input value is transparent in the latter case)
              placeholder={inputPlaceholderText} 
              className={`flex-grow p-3 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-lg shadow-sm placeholder-gray-400 w-full ${modeClasses.inputBg}`}
              // When the suggestion overlay is visible, make the actual text the user types transparent 
              // to avoid double text display until the suggestion disappears on first character input.
              style={!searchTerm && !hasSearched ? { color: 'transparent', caretColor: 'inherit' } : {}}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className={`bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-150 transform hover:scale-[1.02] disabled:opacity-50 ${modeClasses.buttonHover}`}
            disabled={loading || !searchTerm.trim()}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Loading and Error States */}
        {loading && (
          <div className={`text-center p-8 rounded-xl shadow-md flex items-center justify-center space-x-3 ${modeClasses.loadingBg}`}>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-lg">Fetching knowledge...</p>
          </div>
        )}

        {error && (
          <div className={`p-4 border rounded-xl shadow-md ${modeClasses.errorBg}`}>
            <p className="font-medium">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {/* Content Area (Selected Article or Search Results) */}
        <main className="mt-8">
          {selectedArticle ? (
            MemoizedArticleView
          ) : (
            results.length > 0 && (
              <div className={`p-6 rounded-2xl shadow-xl ${modeClasses.cardBg} ${isDarkMode ? 'border border-gray-700' : ''}`}>
                <h2 className={`text-2xl font-semibold mb-6 border-b pb-3 ${isDarkMode ? 'text-gray-100 border-gray-700' : 'text-gray-800 border-gray-200'}`}>
                  Search Results ({results.length})
                </h2>
                {MemoizedSearchResults}
              </div>
            )
          )}
          
          {/* Placeholder for initial state */}
          {!loading && !error && results.length === 0 && !selectedArticle && (
            <div className={`text-center p-12 rounded-xl shadow-inner ${isDarkMode ? 'bg-gray-800/50 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
              <p className="text-lg">Enter a topic above to start exploring Wikipedia content!</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
