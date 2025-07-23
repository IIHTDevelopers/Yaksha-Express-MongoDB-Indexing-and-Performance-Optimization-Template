const request = require('supertest');
const app = require('../app');  // The path to your Express app

let appBoundaryTest = `App boundary test`;

describe('App', () => {
    describe('boundary', () => {

        // Test 2: Test if the /api/hotels route returns 404 for an invalid endpoint
        it(`${appBoundaryTest} should return 404 for an invalid endpoint`, async () => {
            const response = await request(app).get('/api/invalidRoute');
            expect(response.status).toBe(404);  // Expect 404 status code for an undefined route
        });

        // Test 6: Test if the error handling middleware works for invalid JSON (e.g., malformed JSON)
        it(`${appBoundaryTest} should return 400 for malformed JSON`, async () => {
            const response = await request(app)
                .post('/api/hotels')
                .set('Content-Type', 'application/json')
                .send('Invalid JSON');

            expect(response.status).toBe(400);  // Expect 400 for malformed JSON
            expect(response.body.message).toBeDefined();
        });
    });
});
