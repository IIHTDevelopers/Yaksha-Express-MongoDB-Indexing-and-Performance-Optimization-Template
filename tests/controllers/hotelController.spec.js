const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../app');  // Your Express app
const Hotel = require('../../models/hotel');  // Hotel model
const hotelController = require('../../controllers/hotelController'); // Path to your controller file

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
        description: 'A beautiful beachfront resort.'
    };
    const createdHotel = await request(app).post('/api/hotels').send(hotelData);
    createdHotelId = createdHotel.body._id;  // Save the hotel ID for use in other tests
});

afterAll(async () => {
    // Close the in-memory MongoDB server after tests
    await mongoose.disconnect();
    await mongoServer.stop();
});

let hotelControllerBoundaryTest = `HotelController boundary test`;

describe('Hotel Controller', () => {
    describe('boundary', () => {

        // Test case for creating a hotel (POST /api/hotels)
        it(`${hotelControllerBoundaryTest} should create a new hotel when all required fields are provided`, async () => {
            const hotelData = {
                name: 'Sunset Resort',
                location: 'California',
                price: 200,
                rooms: 50,
                description: 'A beautiful beachfront resort.'
            };

            const response = await request(app)
                .post('/api/hotels')
                .send(hotelData);

            expect(response.status).toBe(201);  // Status 201 for created
            expect(response.body.message).toBe('Hotel successfully added!');
            createdHotelId = response.body._id;  // Save the ID for future use
        });

        // Test case for creating a hotel with missing fields
        it(`${hotelControllerBoundaryTest} should return an error if required fields are missing`, async () => {
            const hotelData = {
                location: "California",
                price: 250,
                rooms: 50,
                description: "A beautiful beachfront resort."
            };

            const response = await request(app)
                .post('/api/hotels')
                .send(hotelData);

            expect(response.status).toBe(400);  // Status 400 for bad request
        });

        // Test case for creating a hotel with empty strings
        it(`${hotelControllerBoundaryTest} should return an error if name or location is an empty string`, async () => {
            const hotelData = {
                name: '',
                location: 'California',
                price: 200,
                rooms: 50,
                description: 'A nice place.'
            };

            const response = await request(app)
                .post('/api/hotels')
                .send(hotelData);

            expect(response.status).toBe(400);  // Status 400 for bad request
        });

        // Test case for query performance with single-field index (location)
        it(`${hotelControllerBoundaryTest} should return hotels using a single-field index on location`, async () => {
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

        // Test case for query performance with compound index (location, price)
        it(`${hotelControllerBoundaryTest} should return hotels using a compound index on location and price`, async () => {
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

        // Test case for query performance with text index (name, description)
        it(`${hotelControllerBoundaryTest} should return hotels using a text index on name and description`, async () => {
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

        // Test case for query performance with dynamic index (on 'price')
        it(`${hotelControllerBoundaryTest} should return hotels using a dynamic index on price`, async () => {
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

        // Test case for query performance with single-field index
        it(`${hotelControllerBoundaryTest} should query hotels using a single-field index on location`, async () => {
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
            const response = await request(app)
                .get('/api/hotels/test-single-field?location=California');  // Test route for single-field index
            console.timeEnd('Single-field index query');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);  // Should return an array of hotels
            expect(response.body.length).toBeGreaterThan(0);  // Should return at least one hotel
        });

        // Test case for query performance with compound index
        it(`${hotelControllerBoundaryTest} should query hotels using a compound index on location and price`, async () => {
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
            const response = await request(app)
                .get('/api/hotels/test-compound?location=Switzerland&price=400');  // Test route for compound index
            console.timeEnd('Compound index query');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);  // Should return an array of hotels
            expect(response.body.length).toBeGreaterThan(0);  // Should return at least one hotel
        });

        // Test case for query performance with text index
        it(`${hotelControllerBoundaryTest} should query hotels using a text index on name and description`, async () => {
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
            const response = await request(app)
                .get('/api/hotels/test-text?search=beachfront');  // Test route for text index
            console.timeEnd('Text index query');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);  // Should return an array of hotels
            expect(response.body.length).toBeGreaterThan(0);  // Should return at least one hotel
        });

        // Test case for query performance with dynamic index (on 'price')
        it(`${hotelControllerBoundaryTest} should query hotels using a dynamic index on price`, async () => {
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
            const response = await request(app)
                .get('/api/hotels/test-dynamic?price=150');  // Test route for dynamic index
            console.timeEnd('Dynamic index query');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);  // Should return an array of hotels
            expect(response.body.length).toBeGreaterThan(0);  // Should return at least one hotel
        });
    });
});
