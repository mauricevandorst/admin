// Authentication configuration
const AUTH_CONFIG = {
    username: 'admin',
    password: 'RiceDesk2024!'
};

// Get authorization header value
function getAuthHeader() {
    const credentials = btoa(`${AUTH_CONFIG.username}:${AUTH_CONFIG.password}`);
    return `Basic ${credentials}`;
}

// Get default headers with authentication
function getAuthHeaders() {
    return {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json'
    };
}

// Override the global fetch to always include auth headers
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
    // Add auth headers to all requests
    options.headers = {
        ...getAuthHeaders(),
        ...(options.headers || {})
    };
    
    return originalFetch(url, options);
};

console.log('Basic Authentication configured');
