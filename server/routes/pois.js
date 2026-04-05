const express = require('express');
const router = express.Router();
const {
  getAllPOIs,
  getPOIById,
  searchPOIs,
  createPOI,
  updatePOI,
  deletePOI,
  getPOIsByCategory
} = require('../controllers/poiController');

// @route   GET /api/pois
// @desc    Get all POIs
// @access  Public
router.get('/', getAllPOIs);

// @route   GET /api/pois/search
// @desc    Search POIs by name or category
// @access  Public
router.get('/search', searchPOIs);

// @route   GET /api/pois/category/:category
// @desc    Get POIs by category
// @access  Public
router.get('/category/:category', getPOIsByCategory);

// @route   GET /api/pois/:id
// @desc    Get POI by ID
// @access  Public
router.get('/:id', getPOIById);

// @route   POST /api/pois
// @desc    Create new POI
// @access  Public (in production, this should be protected)
router.post('/', createPOI);

// @route   PUT /api/pois/:id
// @desc    Update POI
// @access  Public (in production, this should be protected)
router.put('/:id', updatePOI);

// @route   DELETE /api/pois/:id
// @desc    Delete POI (soft delete)
// @access  Public (in production, this should be protected)
router.delete('/:id', deletePOI);

module.exports = router;

