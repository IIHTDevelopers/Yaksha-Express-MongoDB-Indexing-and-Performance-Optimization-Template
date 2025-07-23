const mongoose = require('mongoose');

// Define the schema for the Hotel model
const hotelSchema = new mongoose.Schema();

// 1. Single-Field Index (e.g., on 'location')

// 2. Compound Index (e.g., on 'location' and 'price')

// 3. Text Index (e.g., on 'name' and 'description')

// Function to create a dynamic index if needed

// Ensure dynamic index creation after connection is established

const Hotel = mongoose.model('Hotel', hotelSchema);

module.exports = Hotel;
