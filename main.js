// main.js - Vite Entry Point

// Import the libraries that were previously loaded via CDN.
// This makes them available as modules for our application code.
import 'p5';
import 'tone';

// Import the main application logic from the user's original app.js
// The '/js/app.js' path is relative to the project root (where index.html is).
import '/js/app.js';

console.log("Vite entry point loaded. App should be starting...");
