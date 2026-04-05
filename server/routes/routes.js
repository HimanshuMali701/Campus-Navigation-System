const express = require('express');
const router = express.Router();

// Mock route calculation function
const calculateRoute = (start, end) => {
  // This is a mock implementation
  // In a real application, you would integrate with a routing service
  // like OpenRouteService, Mapbox Directions API, or OSRM
  
  const startLat = parseFloat(start.lat);
  const startLng = parseFloat(start.lng);
  const endLat = parseFloat(end.lat);
  const endLng = parseFloat(end.lng);
  
  // Create a simple straight line route with some intermediate points
  const steps = 5;
  const route = [];
  
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    const lat = startLat + (endLat - startLat) * ratio;
    const lng = startLng + (endLng - startLng) * ratio;
    route.push([lat, lng]);
  }
  
  // Calculate approximate distance (Haversine formula)
  const R = 6371; // Earth's radius in kilometers
  const dLat = (endLat - startLat) * Math.PI / 180;
  const dLng = (endLng - startLng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(startLat * Math.PI / 180) * Math.cos(endLat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return {
    route,
    distance: Math.round(distance * 1000), // Convert to meters
    duration: Math.round(distance * 1000 / 1.4 * 60), // Assume walking speed of 1.4 m/s
    instructions: [
      'Head towards your destination',
      'Continue straight',
      'You have arrived at your destination'
    ]
  };
};

// @route   POST /api/routes/calculate
// @desc    Calculate route between two points
// @access  Public
router.post('/calculate', (req, res) => {
  try {
    const { start, end } = req.body;
    
    // Validate input
    if (!start || !end || !start.lat || !start.lng || !end.lat || !end.lng) {
      return res.status(400).json({
        success: false,
        message: 'Start and end coordinates are required (lat, lng)'
      });
    }
    
    const routeData = calculateRoute(start, end);
    
    res.json({
      success: true,
      data: {
        start: {
          latitude: parseFloat(start.lat),
          longitude: parseFloat(start.lng)
        },
        end: {
          latitude: parseFloat(end.lat),
          longitude: parseFloat(end.lng)
        },
        route: routeData.route,
        distance: routeData.distance,
        duration: routeData.duration,
        instructions: routeData.instructions,
        type: 'walking'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error calculating route',
      error: error.message
    });
  }
});

// @route   GET /api/routes/test
// @desc    Test route endpoint
// @access  Public
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Routes API is working!',
    endpoints: [
      'POST /api/routes/calculate - Calculate route between two points'
    ]
  });
});

module.exports = router;

