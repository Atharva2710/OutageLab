const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');

describe('OutageLab API Suite', () => {
  beforeAll(async () => {
    // Ensure mongoose is connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('GET /api/health should return ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.service).toBe('OutageLab API');
  });

  it('GET /api/scenarios should return active scenarios', async () => {
    const res = await request(app).get('/api/scenarios');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('POST /api/auth/register and /api/auth/me should verify JWT workflow', async () => {
    const randomUser = `test_${Date.now()}`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: randomUser,
        email: `${randomUser}@example.com`,
        password: 'Password123!',
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    const cookie = regRes.headers['set-cookie'];
    expect(cookie).toBeDefined();

    // Verify token with /api/auth/me
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookie);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.username).toBe(randomUser);
  });
});
