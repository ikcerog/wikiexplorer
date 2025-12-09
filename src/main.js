import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './WikiExplorer.jsx'; // Import your main component

// Find the root element defined in index.html
const rootElement = document.getElementById('root');

// Create a root and render the application
if (rootElement) {
  // Use ReactDOM to mount the App component into the root element
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      {/* Your main component */}
      <App />
    </React.StrictMode>
  );
} else {
    // Log an error if the mount point is missing
    console.error("Could not find root element to mount React application.");
}