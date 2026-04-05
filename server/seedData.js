const mongoose = require('mongoose');
const POI = require('./models/POI');
const poisData = require('../data/pois.json');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campus_navigation', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    // Clear existing POIs
    await POI.deleteMany({});
    console.log('Cleared existing POI data');
    
    // Insert new POI data
    const insertedPOIs = await POI.insertMany(poisData);
    console.log(`Inserted ${insertedPOIs.length} POIs into the database`);
    
    // Display inserted POIs
    insertedPOIs.forEach(poi => {
      console.log(`- ${poi.name} (${poi.category})`);
    });
    
    console.log('Database seeding completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seeding function
seedDatabase();

