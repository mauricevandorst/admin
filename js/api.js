// API wrapper functions
async function apiRequest(endpoint, options = {}) {
    const config = getAppConfig();
    const url = `${config.apiUrl}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        'x-functions-key': config.apiKey,
        ...options.headers
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        // Handle empty responses (204 No Content)
        if (response.status === 204) {
            return null;
        }

        const text = await response.text();
        return text ? JSON.parse(text) : null;
    } catch (error) {
        console.error('API Request failed:', error);
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
