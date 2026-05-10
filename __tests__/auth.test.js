const request = require("supertest");

process.env.NODE_ENV = "test";
process.env.STORAGE_DRIVER = "json";
process.env.DATA_JSON_FILE = "storage/test-data.json";
process.env.WEBSOCKET_ENABLED = "false";
process.env.REDIS_ENABLED = "false";
process.env.DEMO_SEED_USERS = "false";

const app = require("../src/app");

describe("Auth API", () => {
  describe("POST /api/auth/signup", () => {
    it("should create a new user", async () => {
      const response = await request(app)
        .post("/api/auth/signup")
        .send({
          email: "test@example.com",
          password: "Test1234567890",
          name: "Test User",
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("user");
      expect(response.body.data).toHaveProperty("accessToken");
      expect(response.body.data).toHaveProperty("refreshToken");
    });

    it("should reject weak password", async () => {
      const response = await request(app)
        .post("/api/auth/signup")
        .send({
          email: "test2@example.com",
          password: "weak",
          name: "Test User",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("WEAK_PASSWORD");
    });

    it("should reject invalid email", async () => {
      const response = await request(app)
        .post("/api/auth/signup")
        .send({
          email: "invalid-email",
          password: "Test1234567890",
          name: "Test User",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_EMAIL");
    });

    it("should reject duplicate email", async () => {
      // First signup
      await request(app)
        .post("/api/auth/signup")
        .send({
          email: "duplicate@example.com",
          password: "Test1234567890",
          name: "Test User",
        });

      // Try to signup again with same email
      const response = await request(app)
        .post("/api/auth/signup")
        .send({
          email: "duplicate@example.com",
          password: "Test1234567890",
          name: "Test User 2",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("EMAIL_EXISTS");
    });
  });

  describe("POST /api/auth/login", () => {
    beforeAll(async () => {
      // Create a test user
      await request(app).post("/api/auth/signup").send({
        email: "login@example.com",
        password: "Test1234567890",
        name: "Login Test",
      });
    });

    it("should login with correct credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "login@example.com",
          password: "Test1234567890",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("accessToken");
      expect(response.body.data).toHaveProperty("refreshToken");
    });

    it("should reject wrong password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "login@example.com",
          password: "WrongPassword123",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_CREDENTIALS");
    });

    it("should reject non-existent user", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "Test1234567890",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_CREDENTIALS");
    });
  });

  describe("GET /api/auth/profile", () => {
    let accessToken;

    beforeAll(async () => {
      const response = await request(app).post("/api/auth/signup").send({
        email: "profile@example.com",
        password: "Test1234567890",
        name: "Profile Test",
      });

      accessToken = response.body.data.accessToken;
    });

    it("should get user profile with valid token", async () => {
      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("id");
      expect(response.body.data).toHaveProperty("email");
      expect(response.body.data.email).toBe("profile@example.com");
    });

    it("should reject request without token", async () => {
      const response = await request(app)
        .get("/api/auth/profile")
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("UNAUTHORIZED");
    });

    it("should reject request with invalid token", async () => {
      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/refresh", () => {
    let refreshToken;

    beforeAll(async () => {
      const response = await request(app).post("/api/auth/signup").send({
        email: "refresh@example.com",
        password: "Test1234567890",
        name: "Refresh Test",
      });

      refreshToken = response.body.data.refreshToken;
    });

    it("should refresh access token with valid refresh token", async () => {
      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("accessToken");
      expect(response.body.data).toHaveProperty("refreshToken");
    });

    it("should reject invalid refresh token", async () => {
      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: "invalid-token" })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REFRESH_TOKEN");
    });
  });
});
