const mongoose = require('mongoose');

const POISchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['library', 'lab', 'cafeteria', 'parking', 'building', 'dormitory', 'sports', 'admin', 'other']
  },
  coordinates: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
  address: {
    type: String,
    required: true
  },
  hours: {
    type: String,
    default: 'Contact for hours'
  },
  contact: {
    phone: String,
    email: String,
    website: String
  },
  amenities: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create index for geospatial queries
POISchema.index({ "coordinates.latitude": 1, "coordinates.longitude": 1 });

// Create text index for search functionality
POISchema.index({ name: 'text', description: 'text', category: 'text' });

module.exports = mongoose.model('POI', POISchema);

