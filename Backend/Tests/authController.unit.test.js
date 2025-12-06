const mockRes = require("./mockRes");
const authController = require("../Controllers/authController");
const { models } = require("../Database/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// ====================== MOCKI ===========================

jest.mock("../Database/db", () => ({
  models: {
    User: {
      findOne: jest.fn(),
      create: jest.fn(),
      findByPk: jest.fn()
    }
  }
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn()
}));

// ====================== TESTY ===========================

describe("AuthController.register", () => {
  it("should register user when email is free", async () => {
    const req = {
      body: {
        Name: "A",
        Lastname: "B",
        City: "C",
        Street: "D",
        StreetNr: "1",
        PhoneNr: "123",
        Email: "test@test.com",
        Password: "pass",
        PostNr: "00-000",
        Role: "Admin",
      }
    };
    const res = mockRes();


    models.User.findOne.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue("hashedPass");
    models.User.create.mockResolvedValue({ UID: 99 });

    await authController.register(req, res);

    expect(models.User.findOne).toHaveBeenCalledWith({
      where: { Email: "test@test.com" }
    });
    expect(bcrypt.hash).toHaveBeenCalledWith("pass", 10);
    expect(models.User.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Registered successfully",
      userId: 99
    });
  });

  it("should return 400 when email exists", async () => {
    const req = { body: { Email: "existing@test.com" } };
    const res = mockRes();


    models.User.findOne.mockResolvedValue({ UID: 1 });

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "User with this email already exists"
    });
  });

  it("should return 500 on server error", async () => {
    const req = { body: {} };
    const res = mockRes();


    models.User.findOne.mockRejectedValue(new Error("DB error"));

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while registering"
    });
  });
});


// ==========================================================

describe("AuthController.login", () => {
  it("should fail with 400 when email or password missing", async () => {
    const req = { body: { Email: "" } };
    const res = mockRes();


    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Email and password are required"
    });
  });

  it("should return 401 when user not found", async () => {
    const req = { body: { Email: "x@test.com", Password: "pass" } };
    const res = mockRes();


    models.User.findOne.mockResolvedValue(null);

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Incorrect email or password"
    });
  });

  it("should return 401 when password invalid", async () => {
    const req = { body: { Email: "a@test.com", Password: "pass" } };
    const res = mockRes();


    models.User.findOne.mockResolvedValue({
      UID: 1,
      Password: "hashedPass"
    });
    bcrypt.compare.mockResolvedValue(false);

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Incorrect email or password"
    });
  });

  it("should return 403 when MustChangePassword = true", async () => {
    const req = { body: { Email: "a@test.com", Password: "pass" } };
    const res = mockRes();


    models.User.findOne.mockResolvedValue({
      UID: 1,
      Password: "hashedPass",
      MustChangePassword: true
    });
    bcrypt.compare.mockResolvedValue(true);

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "Temporary password. You must change it before logging in.",
      mustChangePassword: true,
      userId: 1
    });
  });

  it("should return success and generate token", async () => {
    const req = { body: { Email: "a@test.com", Password: "pass" } };
    const res = mockRes();


    res.cookie = jest.fn();

    models.User.findOne.mockResolvedValue({
      UID: 1,
      Password: "hashedPass",
      Role: "Admin"
    });

    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue("fakeToken");

    await authController.login(req, res);

    expect(jwt.sign).toHaveBeenCalled();
    expect(res.cookie).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      message: "Logged in successfully",
      role: "Admin"
    });
  });

  it("should return 500 on error", async () => {
    const req = { body: { Email: "x", Password: "y" } };
    const res = mockRes();


    models.User.findOne.mockRejectedValue(new Error("boom"));

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while logging in"
    });
  });
});

// ==========================================================

describe("AuthController.logout", () => {
  it("should clear cookie and return message", () => {
    const req = {};
    const res = mockRes();

    res.clearCookie = jest.fn();

    authController.logout(req, res);

    expect(res.clearCookie).toHaveBeenCalledWith("token");
    expect(res.json).toHaveBeenCalledWith({ message: "Logged out successfully" });
  });
});

// ==========================================================

describe("AuthController.me", () => {
  it("should return user data", async () => {
    const req = { user: { id: 1 } };
    const res = mockRes();


    models.User.findByPk.mockResolvedValue({ UID: 1, Email: "a@test.com" });

    await authController.me(req, res);

    expect(models.User.findByPk).toHaveBeenCalledWith(1, {
      attributes: { exclude: ["Password"] }
    });
    expect(res.json).toHaveBeenCalledWith({ UID: 1, Email: "a@test.com" });
  });

  it("should return 500 on error", async () => {
    const req = { user: { id: 1 } };
    const res = mockRes();


    models.User.findByPk.mockRejectedValue(new Error("err"));

    await authController.me(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while fetching user"
    });
  });
});
