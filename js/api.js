// API wrapper functions with retry logic for cold starts
async function apiRequest(endpoint, options = {}, retryCount = 0) {
    const config = getAppConfig();
    const url = `${config.apiUrl}${endpoint}`;
    const maxRetries = 3;
    const retryDelay = [1000, 2000, 3000]; // Delays in ms for each retry

    // Get Basic Auth credentials from config
    const basicAuthHeader = btoa(`${config.username}:${config.password}`);

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuthHeader}`,
        ...options.headers
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        // Handle 503 Service Unavailable (Azure Function cold start or scaling issues)
        if (response.status === 503 && retryCount < maxRetries) {
            const errorText = await response.text();

            // Check if it's a cold start or scaling issue
            if (errorText.includes('Function host is not running') || 
                errorText.includes('Service Unavailable') ||
                errorText.includes('host is starting') ||
                errorText.includes('scaling')) {

                const delay = retryDelay[retryCount];
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, delay));

                // Retry the request
                return await apiRequest(endpoint, options, retryCount + 1);
            }
        }

        if (!response.ok) {
            const errorText = await response.text();

            // Log all non-OK responses for diagnostics
            if (response.status !== 404) { // Don't spam 404s
                console.error(`❌ HTTP ${response.status} for ${endpoint}: ${errorText.substring(0, 200)}`);
            }

            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        // Handle empty responses (204 No Content)
        if (response.status === 204) {
            return null;
        }

        const text = await response.text();
        return text ? JSON.parse(text) : null;
    } catch (error) {
        // Retry on network errors if we haven't exhausted retries
        if (retryCount < maxRetries && (
            error.name === 'TypeError' || 
            error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError')
        )) {
            const delay = retryDelay[retryCount];
            await new Promise(resolve => setTimeout(resolve, delay));
            return await apiRequest(endpoint, options, retryCount + 1);
        }

        // Only log if all retries failed
        console.error(`API Request failed for ${endpoint}:`, error.message);
        throw error;
    }
}

// Generic CRUD operations
async function getAll(resource) {
    return await apiRequest(`/${resource}`);
}

async function getById(resource, id) {
    return await apiRequest(`/${resource}/${id}`);
}

async function create(resource, data) {
    return await apiRequest(`/${resource}`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function update(resource, id, data) {
    return await apiRequest(`/${resource}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

async function remove(resource, id) {
    return await apiRequest(`/${resource}/${id}`, {
        method: 'DELETE'
    });
}

// Health check and warmup functions
async function checkHealth() {
    try {
        const response = await apiRequest('/health');
        return true;
    } catch (error) {
        return false;
    }
}

async function warmupFunctionApp() {
    try {
        await apiRequest('/warmup');
        return true;
    } catch (error) {
        return false;
    }
}


