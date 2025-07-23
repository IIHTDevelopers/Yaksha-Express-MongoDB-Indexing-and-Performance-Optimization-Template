const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../app');  // Path to your Express app
const Hotel = require('../../models/hotel');  // Hotel model
const fs = require('fs');
const path = require('path');

let mongoServer;
let createdHotelId;

beforeAll(async () => {
    // Start an in-memory MongoDB server before tests
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

    // Create a hotel and save its ID for later use in review-related test cases
    const hotelData = {
        name: 'Sunset Resort',
        location: 'California',
        price: 200,
        rooms: 50,
        description: "A beautiful beachfront resort."
    };
    const createdHotel = await request(app).post('/api/hotels').send(hotelData);
    createdHotelId = createdHotel.body._id;  // Save the hotel ID for use in other tests
});

afterAll(async () => {
    // Close the in-memory MongoDB server after tests
    await mongoose.disconnect();
    await mongoServer.stop();
});

let hotelBoundaryTest = `HotelModel boundary test`;

describe('Hotel Model', () => {
    describe('boundary', () => {

        // Test case for creating a valid hotel
        it(`${hotelBoundaryTest} should create a valid hotel`, async () => {
            const hotelData = {
                name: 'Sunset Resort',
                location: 'California',
                price: 200,
                rooms: 50
            };

            const hotel = new Hotel(hotelData);
            await hotel.save();

            // Check if the hotel was created successfully
            expect(hotel).toHaveProperty('_id');
            expect(hotel.name).toBe(hotelData.name);
            expect(hotel.location).toBe(hotelData.location);
            expect(hotel.price).toBe(hotelData.price);
            expect(hotel.rooms).toBe(hotelData.rooms);
        });

        // Test case for checking the single-field index (on 'location')
        it(`${hotelBoundaryTest}should query hotels using a single-field index on location`, async () => {
            const hotelData = {
                name: 'Ocean Breeze',
                location: 'California',
                price: 300,
                rooms: 50,
                description: 'Oceanfront view'
            };
            const hotel = new Hotel(hotelData);
            await hotel.save();

            // Query with location (this should use the index on `location`)
            console.time('Single-field index query');
            const foundHotel = await Hotel.find({ location: 'California' });
            console.timeEnd('Single-field index query');

            expect(foundHotel.length).toBeGreaterThan(0);  // Should return at least one hotel
        });

        // Test case for checking compound index (on 'location' and 'price')
        it(`${hotelBoundaryTest}should query hotels using a compound index on location and price`, async () => {
            const hotelData = {
                name: 'Mountain Retreat',
                location: 'Switzerland',
                price: 400,
                rooms: 60,
                description: 'Mountain view'
            };
            const hotel = new Hotel(hotelData);
            await hotel.save();

            // Query with location and price (this should use the compound index)
            console.time('Compound index query');
            const foundHotel = await Hotel.find({ location: 'Switzerland', price: 400 });
            console.timeEnd('Compound index query');

            expect(foundHotel.length).toBeGreaterThan(0);  // Should return at least one hotel
        });

        // Test case for checking text index (on 'name' and 'description')
        it(`${hotelBoundaryTest}should query hotels using a text index on name and description`, async () => {
            const hotelData = {
                name: 'Beachfront Paradise',
                location: 'California',
                price: 500,
                rooms: 80,
                description: 'A beautiful beachfront resort with stunning views of the ocean.'
            };
            const hotel = new Hotel(hotelData);
            await hotel.save();

            // Perform a text search for "beachfront"
            console.time('Text index query');
            const foundHotel = await Hotel.find({ $text: { $search: 'beachfront' } });
            console.timeEnd('Text index query');

            expect(foundHotel.length).toBeGreaterThan(0);  // Should return at least one hotel
        });

        // Test case for checking dynamic index (on 'price')
        it(`${hotelBoundaryTest}should create and use a dynamic index on price`, async () => {
            const hotelData = {
                name: 'Luxury Stay',
                location: 'New York',
                price: 150,
                rooms: 40,
                description: 'High-end luxury hotel.'
            };
            const hotel = new Hotel(hotelData);
            await hotel.save();

            // Query with price (this should use the dynamic index if it exists)
            console.time('Dynamic index query');
            const foundHotel = await Hotel.find({ price: { $gt: 100 } });
            console.timeEnd('Dynamic index query');

            expect(foundHotel.length).toBeGreaterThan(0);  // Should return at least one hotel
        });

        it(`${hotelBoundaryTest}should check if the index for location is defined in the model`, () => {
            const filePath = path.join(__dirname, '../../models/hotel.js'); // Path to your hotel.js model file

            // Read the content of the hotel.js file
            const fileContent = fs.readFileSync(filePath, 'utf-8');

            // Check if the index({ location: 1 }) is defined in the file
            const indexExists = fileContent.includes('index({ location: 1 })');

            // Assert that the index is found
            expect(indexExists).toBe(true);  // The test will fail if the string is not found
        });

        it(`${hotelBoundaryTest}should check if the text index for name and description is defined in the model`, () => {
            const filePath = path.join(__dirname, '../../models/hotel.js'); // Path to your hotel.js model file

            // Read the content of the hotel.js file
            const fileContent = fs.readFileSync(filePath, 'utf-8');

            // Check if the text index on name and description is defined in the file
            const textIndexExists = fileContent.includes('index({ name: \'text\', description: \'text\' })');

            // Assert that the text index is found
            expect(textIndexExists).toBe(true);  // The test will fail if the string is not found
        });

        it(`${hotelBoundaryTest}should check if the compound index for location and price is defined in the model`, () => {
            const filePath = path.join(__dirname, '../../models/hotel.js'); // Path to your hotel.js model file

            // Read the content of the hotel.js file
            const fileContent = fs.readFileSync(filePath, 'utf-8');

            // Check if the compound index on location and price is defined in the file
            const compoundIndexExists = fileContent.includes('index({ location: 1, price: 1 })');

            // Assert that the compound index is found
            expect(compoundIndexExists).toBe(true);  // The test will fail if the string is not found
        });
    });
});
