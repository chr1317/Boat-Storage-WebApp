// Backend/Tests/seasonsController.unit.test.js
const mockResponse = require("./mockRes");
const seasonsController = require("../Controllers/seasonsController");

// Mock DB
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
      Seasons: {
        create: jest.fn(),
        findAll: jest.fn(),
        findByPk: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn(),
        count: jest.fn(),
      },
      BoatStorage: {
        count: jest.fn(),
      },
    },
    __mockTransaction: mockTransaction,
  };
});

const { models, __mockTransaction: t } = require("../Database/db");

// wspólne before/after
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ============================================================
// CREATE
// ============================================================
describe("seasonsController.create", () => {
  it("returns 400 if some fields are missing", async () => {
    const req = {
      body: {
        year_start: 2024,
        // year_end, StartDate, EndDate missing
      },
    };
    const res = mockResponse();

    await seasonsController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "All fields are required",
    });
  });

  it("returns 400 if EndDate is before StartDate", async () => {
    const req = {
      body: {
        year_start: 2024,
        year_end: 2025,
        StartDate: "2024-10-10",
        EndDate: "2024-09-10", // wcześniejsza
      },
    };
    const res = mockResponse();

    await seasonsController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Incorrect date range",
    });
  });

  it("returns 409 if new season overlaps existing one", async () => {
    const req = {
      body: {
        year_start: 2024,
        year_end: 2025,
        StartDate: "2024-04-01",
        EndDate: "2024-10-01",
      },
    };
    const res = mockResponse();

    // hasOverlap -> models.Seasons.count > 0
    models.Seasons.count.mockResolvedValue(1);

    await seasonsController.create(req, res);

    expect(models.Seasons.count).toHaveBeenCalled();
    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "Conflict with existing season",
    });
  });

  it("creates season successfully", async () => {
    const req = {
      body: {
        year_start: 2024,
        year_end: 2025,
        StartDate: "2024-04-01",
        EndDate: "2024-10-01",
      },
    };
    const res = mockResponse();

    models.Seasons.count.mockResolvedValue(0); // brak overlap
    const created = { seasonID: 1, year_start: 2024, year_end: 2025 };
    models.Seasons.create.mockResolvedValue(created);

    await seasonsController.create(req, res);

    expect(models.Seasons.create).toHaveBeenCalled();
    expect(t.commit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(created);
  });

  it("returns 500 on error", async () => {
    const req = {
      body: {
        year_start: 2024,
        year_end: 2025,
        StartDate: "2024-04-01",
        EndDate: "2024-10-01",
      },
    };
    const res = mockResponse();

    models.Seasons.count.mockResolvedValue(0);
    models.Seasons.create.mockRejectedValue(new Error("DB error"));

    await seasonsController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Error while creating season",
    });
  });
});

// ============================================================
// LIST
// ============================================================
describe("seasonsController.list", () => {
  it("returns list of seasons", async () => {
    const req = {};
    const res = mockResponse();

    const seasons = [{ seasonID: 1 }, { seasonID: 2 }];
    models.Seasons.findAll.mockResolvedValue(seasons);

    await seasonsController.list(req, res);

    expect(models.Seasons.findAll).toHaveBeenCalledWith({
      order: [["StartDate", "ASC"]],
    });
    expect(res.json).toHaveBeenCalledWith(seasons);
  });

  it("returns 500 on error", async () => {
    const req = {};
    const res = mockResponse();

    models.Seasons.findAll.mockRejectedValue(new Error("err"));

    await seasonsController.list(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Error while listing seasons",
    });
  });
});

// ============================================================
// GET ONE
// ============================================================
describe("seasonsController.getOne", () => {
  it("returns 404 when season not found", async () => {
    const req = { params: { id: "1" } };
    const res = mockResponse();

    models.Seasons.findByPk.mockResolvedValue(null);

    await seasonsController.getOne(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Season not found" });
  });

  it("returns season", async () => {
    const req = { params: { id: "1" } };
    const res = mockResponse();

    const season = { seasonID: 1 };
    models.Seasons.findByPk.mockResolvedValue(season);

    await seasonsController.getOne(req, res);

    expect(res.json).toHaveBeenCalledWith(season);
  });

  it("returns 500 on error", async () => {
    const req = { params: { id: "1" } };
    const res = mockResponse();

    models.Seasons.findByPk.mockRejectedValue(new Error("err"));

    await seasonsController.getOne(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Error while getting season",
    });
  });
});

// ============================================================
// UPDATE
// ============================================================
describe("seasonsController.update", () => {
  it("returns 404 when season not found", async () => {
    const req = { params: { id: "1" }, body: {} };
    const res = mockResponse();

    models.Seasons.findByPk.mockResolvedValue(null);

    await seasonsController.update(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Season not found" });
  });

  it("returns 400 when new date range is invalid", async () => {
    const req = {
      params: { id: "1" },
      body: {
        StartDate: "2024-10-10",
        EndDate: "2024-09-10", // e < s
      },
    };
    const res = mockResponse();

    models.Seasons.findByPk.mockResolvedValue({
      seasonID: 1,
      StartDate: new Date("2024-04-01"),
      EndDate: new Date("2024-10-01"),
    });

    await seasonsController.update(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Incorrect date range",
    });
  });

  it("returns 409 when date range conflicts with other seasons", async () => {
    const req = {
      params: { id: "1" },
      body: {
        StartDate: "2024-04-01",
        EndDate: "2024-10-01",
      },
    };
    const res = mockResponse();

    models.Seasons.findByPk.mockResolvedValue({
      seasonID: 1,
      StartDate: new Date("2024-01-01"),
      EndDate: new Date("2024-12-31"),
    });

    // hasOverlap -> Seasons.count > 0
    models.Seasons.count.mockResolvedValue(1);

    await seasonsController.update(req, res);

    expect(models.Seasons.count).toHaveBeenCalled();
    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "Conflict with existing season",
    });
  });

  it("updates season successfully", async () => {
    const req = {
      params: { id: "1" },
      body: {
        year_start: 2025,
        year_end: 2026,
        StartDate: "2025-04-01",
        EndDate: "2025-10-01",
      },
    };
    const res = mockResponse();

    const existing = {
      seasonID: 1,
      StartDate: new Date("2024-04-01"),
      EndDate: new Date("2024-10-01"),
    };

    models.Seasons.findByPk
      .mockResolvedValueOnce(existing) // pierwsze findByPk w kontrolerze
      .mockResolvedValueOnce({
        seasonID: 1,
        year_start: 2025,
        year_end: 2026,
        StartDate: new Date("2025-04-01"),
        EndDate: new Date("2025-10-01"),
      }); // refreshed

    models.Seasons.count.mockResolvedValue(0);

    await seasonsController.update(req, res);

    expect(models.Seasons.update).toHaveBeenCalledWith(
      expect.objectContaining({
        year_start: 2025,
        year_end: 2026,
        StartDate: expect.any(Date),
        EndDate: expect.any(Date),
      }),
      expect.objectContaining({
        where: { seasonID: 1 },
        transaction: t,
      })
    );
    expect(t.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        seasonID: 1,
        year_start: 2025,
        year_end: 2026,
      })
    );
  });

  it("returns 500 on error", async () => {
    const req = { params: { id: "1" }, body: {} };
    const res = mockResponse();

    models.Seasons.findByPk.mockRejectedValue(new Error("err"));

    await seasonsController.update(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Error while updating season",
    });
  });
});

// ============================================================
// DELETE
// ============================================================
describe("seasonsController.delete", () => {
  it("returns 409 when season has boat storage entries", async () => {
    const req = { params: { id: "1" } };
    const res = mockResponse();

    models.BoatStorage.count.mockResolvedValue(3);

    await seasonsController.delete(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(models.BoatStorage.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { seasonID: 1 },
        transaction: t,
      })
    );
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "Season has boat storage entries and cannot be deleted",
    });
  });

  it("returns 404 when season not found", async () => {
    const req = { params: { id: "1" } };
    const res = mockResponse();

    models.BoatStorage.count.mockResolvedValue(0);
    models.Seasons.findByPk.mockResolvedValue(null);

    await seasonsController.delete(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "Season not found",
    });
  });

  it("deletes season", async () => {
    const req = { params: { id: "1" } };
    const res = mockResponse();

    models.BoatStorage.count.mockResolvedValue(0);
    models.Seasons.findByPk.mockResolvedValue({ seasonID: 1 });

    await seasonsController.delete(req, res);

    expect(models.Seasons.destroy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { seasonID: 1 },
        transaction: t,
      })
    );
    expect(t.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: "Season deleted" });
  });

  it("returns 500 on error", async () => {
    const req = { params: { id: "1" } };
    const res = mockResponse();

    models.BoatStorage.count.mockRejectedValue(new Error("err"));

    await seasonsController.delete(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Error while deleting season",
    });
  });
});
