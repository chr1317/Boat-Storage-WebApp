const mockRes = require("./mockRes");
const dimensionsController = require("../Controllers/boatDimensionsController");
const { models, sequelize } = require("../Database/db");

const mockTransaction = {
  commit: jest.fn(),
  rollback: jest.fn(),
  LOCK: { UPDATE: "UPDATE" }
};

// ---- MOCK DB ----
jest.mock("../Database/db", () => ({
  sequelize: {
    transaction: jest.fn(() => mockTransaction),
  },
  models: {
    Boats: { findByPk: jest.fn() },
    BoatDimensions: {
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      destroy: jest.fn(),
    },
  },
}));

// ==================================================
// CREATE
// ==================================================
describe("dimensionsController.create", () => {
  it("should return 400 when BID missing", async () => {
    const req = { body: {} };
    const res = mockRes();

    await dimensionsController.create(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "BID is required" });
  });

  it("should return 404 when boat not found", async () => {
    const req = { body: { BID: 1 }, user: { role: "Admin" } };
    const res = mockRes();

    models.Boats.findByPk.mockResolvedValue(null);

    await dimensionsController.create(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Boat not found" });
  });

  it("should return 403 when user not owner", async () => {
    const req = { body: { BID: 1 }, user: { role: "Client", id: 9 } };
    const res = mockRes();

    models.Boats.findByPk.mockResolvedValue({ UID: 5 });

    await dimensionsController.create(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
  });

  it("should return 409 when dimensions already exist", async () => {
    const req = { body: { BID: 1 }, user: { role: "Admin" } };
    const res = mockRes();

    models.Boats.findByPk.mockResolvedValue({ UID: 1 });
    models.BoatDimensions.findOne.mockResolvedValue({});

    await dimensionsController.create(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "Dimensions already exist for this boat"
    });
  });

  it("should create dimensions", async () => {
    const req = { body: { BID: 1, Length: 10 }, user: { role: "Admin" } };
    const res = mockRes();

    models.Boats.findByPk.mockResolvedValue({ UID: 1 });
    models.BoatDimensions.findOne.mockResolvedValue(null);
    models.BoatDimensions.create.mockResolvedValue({ BID: 1, Length: 10 });

    await dimensionsController.create(req, res);

    expect(mockTransaction.commit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ BID: 1, Length: 10 });
  });

  it("should return 500 on error", async () => {
    const req = { body: { BID: 1 }, user: { role: "Admin" } };
    const res = mockRes();

    models.Boats.findByPk.mockRejectedValue(new Error("fail"));

    await dimensionsController.create(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while creating dimensions"
    });
  });
});

// ==================================================
// GET BY BID
// ==================================================
describe("dimensionsController.getByBid", () => {
  it("should return 404 if not found", async () => {
    const req = { params: { bid: "1" }, user: { role: "Admin" } };
    const res = mockRes();

    models.BoatDimensions.findOne.mockResolvedValue(null);

    await dimensionsController.getByBid(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Dimensions not found" });
  });

  it("should return 403 when not owner", async () => {
    const req = { params: { bid: "1" }, user: { role: "Client", id: 2 } };
    const res = mockRes();

    models.BoatDimensions.findOne.mockResolvedValue({
      Boat: { UID: 5 }
    });

    await dimensionsController.getByBid(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
  });

  it("should return dimensions", async () => {
    const req = { params: { bid: "1" }, user: { role: "Admin" } };
    const res = mockRes();

    models.BoatDimensions.findOne.mockResolvedValue({ BID: 1 });

    await dimensionsController.getByBid(req, res);

    expect(res.json).toHaveBeenCalledWith({ BID: 1 });
  });

  it("should return 500 on error", async () => {
    const req = { params: { bid: "1" }, user: { role: "Admin" } };
    const res = mockRes();

    models.BoatDimensions.findOne.mockRejectedValue(new Error("err"));

    await dimensionsController.getByBid(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while fetching dimensions"
    });
  });
});

// ==================================================
// UPDATE
// ==================================================
describe("dimensionsController.updateByBid", () => {
  it("should return 404 when not found", async () => {
    const req = { params: { bid: "1" }, user: { role: "Admin" } };
    const res = mockRes();

    models.BoatDimensions.findOne.mockResolvedValue(null);

    await dimensionsController.updateByBid(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Dimensions not found" });
  });

  it("should return 403 when not owner", async () => {
    const req = { params: { bid: "1" }, user: { role: "Client", id: 10 } };
    const res = mockRes();

    models.BoatDimensions.findOne.mockResolvedValue({
      Boat: { UID: 2 }
    });

    await dimensionsController.updateByBid(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
  });

  it("should update dimensions", async () => {
    const req = { params: { bid: "1" }, body: { Length: 15 }, user: { role: "Admin" } };
    const res = mockRes();

    models.BoatDimensions.findOne.mockResolvedValue({ Boat: { UID: 1 } });
    models.BoatDimensions.update.mockResolvedValue([1]);
    models.BoatDimensions.findOne.mockResolvedValue({ BID: 1, Length: 15 });

    await dimensionsController.updateByBid(req, res);

    expect(mockTransaction.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ BID: 1, Length: 15 });
  });

  it("should return 500 on error", async () => {
    const req = { params: { bid: "1" }, user: { role: "Admin" } };
    const res = mockRes();

    models.BoatDimensions.findOne.mockRejectedValue(new Error("err"));

    await dimensionsController.updateByBid(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while updating dimensions"
    });
  });
});

// ==================================================
// DELETE
// ==================================================
describe("dimensionsController.deleteByBid", () => {
  it("should return 404 when not found", async () => {
    const req = { params: { bid: "1" } };
    const res = mockRes();

    models.BoatDimensions.findOne.mockResolvedValue(null);

    await dimensionsController.deleteByBid(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Dimensions not found" });
  });

  it("should delete dimensions", async () => {
    const req = { params: { bid: "1" } };
    const res = mockRes();

    models.BoatDimensions.findOne.mockResolvedValue({ BID: 1 });
    models.BoatDimensions.destroy.mockResolvedValue(1);

    await dimensionsController.deleteByBid(req, res);

    expect(mockTransaction.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: "Dimensions deleted" });
  });

  it("should return 500 on error", async () => {
    const req = { params: { bid: "1" } };
    const res = mockRes();

    models.BoatDimensions.findOne.mockRejectedValue(new Error("err"));

    await dimensionsController.deleteByBid(req, res);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while deleting dimensions"
    });
  });
});
