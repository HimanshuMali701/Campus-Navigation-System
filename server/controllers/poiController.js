const POI = require('../models/POI');

// Get all POIs
const getAllPOIs = async (req, res) => {
  try {
    const pois = await POI.find({ isActive: true });
    res.json({
      success: true,
      count: pois.length,
      data: pois
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching POIs',
      error: error.message
    });
  }
};

// Get POI by ID
const getPOIById = async (req, res) => {
  try {
    const poi = await POI.findById(req.params.id);
    if (!poi) {
      return res.status(404).json({
        success: false,
        message: 'POI not found'
      });
    }
    res.json({
      success: true,
      data: poi
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching POI',
      error: error.message
    });
  }
};

// Search POIs by name or category
const searchPOIs = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const pois = await POI.find({
      $and: [
        { isActive: true },
        {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { category: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    });

    res.json({
      success: true,
      count: pois.length,
      data: pois
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching POIs',
      error: error.message
    });
  }
};

// Create new POI
const createPOI = async (req, res) => {
  try {
    const poi = new POI(req.body);
    const savedPOI = await poi.save();
    res.status(201).json({
      success: true,
      message: 'POI created successfully',
      data: savedPOI
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating POI',
      error: error.message
    });
  }
};

// Update POI
const updatePOI = async (req, res) => {
  try {
    const poi = await POI.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!poi) {
      return res.status(404).json({
        success: false,
        message: 'POI not found'
      });
    }

    res.json({
      success: true,
      message: 'POI updated successfully',
      data: poi
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating POI',
      error: error.message
    });
  }
};

// Delete POI (soft delete)
const deletePOI = async (req, res) => {
  try {
    const poi = await POI.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!poi) {
      return res.status(404).json({
        success: false,
        message: 'POI not found'
      });
    }

    res.json({
      success: true,
      message: 'POI deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting POI',
      error: error.message
    });
  }
};

// Get POIs by category
const getPOIsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const pois = await POI.find({ category, isActive: true });
    
    res.json({
      success: true,
      count: pois.length,
      data: pois
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching POIs by category',
      error: error.message
    });
  }
};

module.exports = {
  getAllPOIs,
  getPOIById,
  searchPOIs,
  createPOI,
  updatePOI,
  deletePOI,
  getPOIsByCategory
};

