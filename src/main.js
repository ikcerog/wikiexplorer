import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './WikiExplorer.jsx'; // Import the JSX component

// Find the root element defined in index.html
const rootElement = document.getElementById('root');

// Create a root and render the application
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      {/* Your main component */}
      <App />
    </React.StrictMode>
  );
} else {
    console.error("Could not find root element to mount React application.");
}
