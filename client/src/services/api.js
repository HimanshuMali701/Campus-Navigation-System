import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('Response error:', error);
    if (error.response) {
      // Server responded with error status
      console.error('Error data:', error.response.data);
      console.error('Error status:', error.response.status);
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received:', error.request);
    } else {
      // Something else happened
      console.error('Error message:', error.message);
    }
    return Promise.reject(error);
  }
);

// POI API functions
export const locationAPI = {
  getAll: async () => {
    const response = await api.get('/locations');
    return response.data;
  },

  // Get POI by ID
  getById: async (id) => {
    try {
      const response = await api.get(`/locations/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch location: ${error.message}`);
    }
  },

  // Search POIs
  search: async (query) => {
    try {
      const response = await api.get(`/locations/search?q=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to search locations: ${error.message}`);
    }
  },
};

// Routes API functions
export const routesAPI = {
  calculate: async (startId, endId) => {
    const isIntString = (value) => /^\d+$/.test(String(value ?? '').trim());

    if (!isIntString(startId) || !isIntString(endId)) {
      throw new Error('Route API requires integer building IDs');
    }

    const start = Number(startId);
    const end = Number(endId);

    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
      throw new Error('Route API requires integer building IDs');
    }

    const response = await api.post('/routes/calculate', {
      start,
      end,
    });
    return response.data;
  },
};

export const scheduleAPI = {
  getNextClass: async (uid) => {
    const response = await api.get(`/schedule/next?uid=${encodeURIComponent(uid || '')}`);
    return response.data;
  },
};

export const emergencyAPI = {
  getAll: async () => {
    const response = await api.get('/emergency');
    return response.data;
  },
};

// PostGIS Spatial Query API functions
export const geoAPI = {
  /**
   * Find nearby locations
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} radius - Search radius in meters (default 500)
   * @param {number} limit - Max results (default 10)
   */
  getNearby: async (lat, lng, radius = 500, limit = 10) => {
    try {
      const response = await api.get('/geo/nearby', {
        params: { lat, lng, radius, limit },
      });
      return response.data;
    } catch (error) {
      console.error('Nearby locations query failed:', error);
      return { success: false, count: 0, data: [] };
    }
  },

  /**
   * Find nearby buildings
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} radius - Search radius in meters (default 500)
   */
  getNearbyBuildings: async (lat, lng, radius = 500) => {
    try {
      const response = await api.get('/geo/buildings/nearby', {
        params: { lat, lng, radius },
      });
      return response.data;
    } catch (error) {
      console.error('Nearby buildings query failed:', error);
      return { success: false, data: { type: 'FeatureCollection', features: [] } };
    }
  },

  /**
   * Find nearby pathways
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} radius - Search radius in meters (default 500)
   */
  getNearbyPathways: async (lat, lng, radius = 500) => {
    try {
      const response = await api.get('/geo/pathways/nearby', {
        params: { lat, lng, radius },
      });
      return response.data;
    } catch (error) {
      console.error('Nearby pathways query failed:', error);
      return { success: false, data: { type: 'FeatureCollection', features: [] } };
    }
  },

  /**
   * Find nearest facility by category
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {string} category - Facility category
   */
  getNearestByCategory: async (lat, lng, category) => {
    try {
      const response = await api.get('/geo/nearest-by-category', {
        params: { lat, lng, category },
      });
      return response.data;
    } catch (error) {
      console.error(`Nearest ${category} query failed:`, error);
      return { success: false, data: null };
    }
  },

  /**
   * Get the zone/area containing a coordinate
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   */
  getZone: async (lat, lng) => {
    try {
      const response = await api.get('/geo/zone', {
        params: { lat, lng },
      });
      return response.data;
    } catch (error) {
      console.error('Zone query failed:', error);
      return { success: false, data: null };
    }
  },
};

// Health check
export const healthCheck = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    throw new Error(`Health check failed: ${error.message}`);
  }
};

export default api;

