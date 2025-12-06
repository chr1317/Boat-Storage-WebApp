// Backend/Tests/boatHallsController.unit.test.js
const boatHallsController = require("../Controllers/boatHallsController");

jest.mock("../Database/db", () => {
  const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn(),
    LOCK: { UPDATE: "UPDATE" },
  };

  return {
    sequelize: {
      transaction: jest.fn(() => Promise.resolve(mockTransaction)),
    },
    models: {
      Boathalls: {
        create: jest.fn(),
        findAll: jest.fn(),
        findByPk: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn(),
      },
      Boats: {
        count: jest.fn(),
      },
    },
    __mockTransaction: mockTransaction,
  };
});

const { models, sequelize, __mockTransaction: t } =
  require("../Database/db");

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

// Silence console.error in tests
beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.clearAllMocks();
});

describe("boatHallsController", () => {
  //
  // CREATE
  //
  describe("create", () => {
    it("should return 400 if missing fields", async () => {
      const req = { body: { Length: 10, Width: 20 } }; // missing Height
      const res = mockRes();

      await boatHallsController.create(req, res);

      expect(t.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Field Height is required",
      });
    });

    it("should create hall", async () => {
      const req = { body: { Length: 10, Width: 20, Height: 30 } };
      const res = mockRes();

      const hall = { BHID: 1, ...req.body };
      models.Boathalls.create.mockResolvedValue(hall);

      await boatHallsController.create(req, res);

      expect(models.Boathalls.create).toHaveBeenCalledWith(
        req.body,
        expect.any(Object)
      );
      expect(t.commit).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(hall);
    });

    it("should return 500 on error", async () => {
      const req = { body: { Length: 10, Width: 20, Height: 30 } };
      const res = mockRes();

      models.Boathalls.create.mockRejectedValue(new Error("boom"));

      await boatHallsController.create(req, res);

      expect(t.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  //
  // LIST
  //
  describe("list", () => {
    it("should list halls", async () => {
      const res = mockRes();
      const halls = [{ BHID: 1 }];

      models.Boathalls.findAll.mockResolvedValue(halls);

      await boatHallsController.list({}, res);

      expect(res.json).toHaveBeenCalledWith(halls);
    });

    it("should return 500 on error", async () => {
      const res = mockRes();

      models.Boathalls.findAll.mockRejectedValue(new Error("err"));

      await boatHallsController.list({}, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  //
  // GET ONE
  //
  describe("getOne", () => {
    it("should return 404 if not found", async () => {
      const req = { params: { id: "1" } };
      const res = mockRes();

      models.Boathalls.findByPk.mockResolvedValue(null);

      await boatHallsController.getOne(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return hall", async () => {
      const req = { params: { id: "1" } };
      const res = mockRes();

      const hall = { BHID: 1 };
      models.Boathalls.findByPk.mockResolvedValue(hall);

      await boatHallsController.getOne(req, res);

      expect(res.json).toHaveBeenCalledWith(hall);
    });

    it("should return 500 on error", async () => {
      const req = { params: { id: "1" } };
      const res = mockRes();

      models.Boathalls.findByPk.mockRejectedValue(new Error("err"));

      await boatHallsController.getOne(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  //
  // UPDATE
  //
  describe("update", () => {
    it("should return 404 if hall does not exist", async () => {
      const req = { params: { id: "1" }, body: {} };
      const res = mockRes();

      models.Boathalls.findByPk.mockResolvedValue(null);

      await boatHallsController.update(req, res);

      expect(t.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return 400 on invalid fields", async () => {
      const req = { params: { id: "1" }, body: { Length: -5 } };
      const res = mockRes();

      models.Boathalls.findByPk.mockResolvedValue({ BHID: 1 });

      await boatHallsController.update(req, res);

      expect(t.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should update hall", async () => {
      const req = { params: { id: "1" }, body: { Length: 50 } };
      const res = mockRes();

      models.Boathalls.findByPk.mockResolvedValueOnce({ BHID: 1 });
      models.Boathalls.findByPk.mockResolvedValueOnce({
        BHID: 1,
        Length: 50,
      });

      await boatHallsController.update(req, res);

      expect(models.Boathalls.update).toHaveBeenCalled();
      expect(t.commit).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        BHID: 1,
        Length: 50,
      });
    });

    it("should return 500 on error", async () => {
      const req = { params: { id: "1" }, body: { Length: 20 } };
      const res = mockRes();

      models.Boathalls.findByPk.mockRejectedValue(new Error("err"));

      await boatHallsController.update(req, res);

      expect(t.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  //
  // DELETE
  //
  describe("remove", () => {
    it("should return 404 if hall not found", async () => {
      const req = { params: { id: "1" } };
      const res = mockRes();

      models.Boathalls.findByPk.mockResolvedValue(null);

      await boatHallsController.remove(req, res);

      expect(t.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return 409 if hall has boats", async () => {
      const req = { params: { id: "1" } };
      const res = mockRes();

      models.Boathalls.findByPk.mockResolvedValue({ BHID: 1 });
      models.Boats.count.mockResolvedValue(2);

      await boatHallsController.remove(req, res);

      expect(t.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("should delete hall", async () => {
      const req = { params: { id: "1" } };
      const res = mockRes();

      models.Boathalls.findByPk.mockResolvedValue({ BHID: 1 });
      models.Boats.count.mockResolvedValue(0);

      await boatHallsController.remove(req, res);

      expect(models.Boathalls.destroy).toHaveBeenCalled();
      expect(t.commit).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: "Boathall deleted" });
    });

    it("should return 500 on error", async () => {
      const req = { params: { id: "1" } };
      const res = mockRes();

      models.Boathalls.findByPk.mockRejectedValue(new Error("err"));

      await boatHallsController.remove(req, res);

      expect(t.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
