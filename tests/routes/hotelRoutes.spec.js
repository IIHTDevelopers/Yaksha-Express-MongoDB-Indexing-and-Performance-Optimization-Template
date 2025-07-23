const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../app');  // Path to your Express app
const Hotel = require('../../models/hotel');  // Hotel model

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
});

let hotelRoutesBoundaryTest = `HotelRoutes boundary test`;

describe('Hotel Routes', () => {
  describe('boundary', () => {

    // Test case for creating a hotel
    it(`${hotelRoutesBoundaryTest} should create a new hotel`, async () => {
      const hotelData = {
        name: 'Sunset Resort',
        location: 'California',
        price: 200,
        rooms: 50
      };

      const response = await request(app).post('/api/hotels').send(hotelData);

      expect(response.status).toBe(201);  // Expect status 201 for created
      createdHotelId = response.body._id;  // Save the ID for future tests
    });

    // Test for Single-Field Index
    it(`${hotelRoutesBoundaryTest} should test query performance with single-field index on location`, async () => {
      console.time('Single-field index query');
      const response = await request(app).get(`/api/hotels/test-single-field?location=California`);
      console.timeEnd('Single-field index query');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);  // Should return an array of hotels
    });

    // Test for Compound Index
    it(`${hotelRoutesBoundaryTest} should test query performance with compound index on location and price`, async () => {
      console.time('Compound index query');
      const response = await request(app).get(`/api/hotels/test-compound?location=California&price=200`);
      console.timeEnd('Compound index query');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);  // Should return an array of hotels
    });

    // Test for Text Index
    it(`${hotelRoutesBoundaryTest} should test query performance with text index on name and description`, async () => {
      console.time('Text index query');
      const response = await request(app).get(`/api/hotels/test-text?search=beachfront`);
      console.timeEnd('Text index query');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);  // Should return an array of hotels
    });

    // Test for Dynamic Index
    it(`${hotelRoutesBoundaryTest} should test query performance with dynamic index on price`, async () => {
      console.time('Dynamic index query');
      const response = await request(app).get(`/api/hotels/test-dynamic?price=200`);
      console.timeEnd('Dynamic index query');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);  // Should return an array of hotels
    });
  });
});