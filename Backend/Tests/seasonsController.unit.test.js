const controller = require("../Controllers/seasonsController");
const mockRes = require("./mockRes");

// ==========================================================================
// MOCK DB
// ==========================================================================
jest.mock("../Database/db", () => {
  const t = {
    commit: jest.fn(),
    rollback: jest.fn(),
    LOCK: { UPDATE: "UPDATE" },
  };

  return {
    sequelize: {
      transaction: jest.fn().mockResolvedValue(t),
    },
    models: {
      Seasons: {
        count: jest.fn(),
        findOne: jest.fn(),
        findAll: jest.fn(),
        findByPk: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn(),
      },
      BoatStorage: {
        count: jest.fn(),
      },
    },
    __t: t,
  };
});

const { models, __t: t } = require("../Database/db");

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

// ==========================================================================
// CREATE
// ==========================================================================
describe("seasonsController.create", () => {
  it("400 when years missing or not integers", async () => {
    const res = mockRes();

    await controller.create({ body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(t.rollback).toHaveBeenCalled();
  });

  it("400 when year difference not 1", async () => {
    const res = mockRes();

    await controller.create(
      { body: { year_start: 2024, year_end: 2026 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("409 when overlapping season exists", async () => {
    const res = mockRes();
    models.Seasons.count.mockResolvedValue(1);

    await controller.create(
      { body: { year_start: 2024, year_end: 2025 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("409 when season with same year range exists", async () => {
    const res = mockRes();
    models.Seasons.count.mockResolvedValue(0);
    models.Seasons.findOne.mockResolvedValue({ seasonID: 1 });

    await controller.create(
      { body: { year_start: 2024, year_end: 2025 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("201 creates season", async () => {
    const res = mockRes();
    models.Seasons.count.mockResolvedValue(0);
    models.Seasons.findOne.mockResolvedValue(null);
    models.Seasons.create.mockResolvedValue({ seasonID: 1 });

    await controller.create(
      { body: { year_start: 2024, year_end: 2025 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(t.commit).toHaveBeenCalled();
  });

  it("500 on create error", async () => {
    const res = mockRes();
    models.Seasons.count.mockRejectedValue(new Error());

    await controller.create(
      { body: { year_start: 2024, year_end: 2025 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ==========================================================================
// LIST
// ==========================================================================
describe("seasonsController.list", () => {
  it("returns list", async () => {
    const res = mockRes();
    models.Seasons.findAll.mockResolvedValue([{ seasonID: 1 }]);

    await controller.list({}, res);

    expect(res.json).toHaveBeenCalledWith([{ seasonID: 1 }]);
  });

  it("500 on list error", async () => {
    const res = mockRes();
    models.Seasons.findAll.mockRejectedValue(new Error());

    await controller.list({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ==========================================================================
// GET ONE
// ==========================================================================
describe("seasonsController.getOne", () => {
  it("404 when not found", async () => {
    const res = mockRes();
    models.Seasons.findByPk.mockResolvedValue(null);

    await controller.getOne({ params: { id: "1" } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns season", async () => {
    const res = mockRes();
    models.Seasons.findByPk.mockResolvedValue({ seasonID: 1 });

    await controller.getOne({ params: { id: "1" } }, res);

    expect(res.json).toHaveBeenCalledWith({ seasonID: 1 });
  });

  it("500 on getOne error", async () => {
    const res = mockRes();
    models.Seasons.findByPk.mockRejectedValue(new Error());

    await controller.getOne({ params: { id: "1" } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ==========================================================================
// UPDATE
// ==========================================================================
describe("seasonsController.update", () => {
  it("404 when season not found", async () => {
    const res = mockRes();
    models.Seasons.findByPk.mockResolvedValue(null);

    await controller.update({ params: { id: "1" }, body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(t.rollback).toHaveBeenCalled();
  });

  it("400 incorrect date range", async () => {
    const res = mockRes();
    models.Seasons.findByPk.mockResolvedValue({
      StartDate: new Date("2025-01-01"),
      EndDate: new Date("2025-12-31"),
    });

    await controller.update(
      {
        params: { id: "1" },
        body: { StartDate: "2025-12-31", EndDate: "2025-01-01" },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("409 overlap on update", async () => {
    const res = mockRes();
    models.Seasons.findByPk.mockResolvedValue({
      StartDate: new Date("2025-01-01"),
      EndDate: new Date("2025-12-31"),
    });
    models.Seasons.count.mockResolvedValue(1);

    await controller.update(
      {
        params: { id: "1" },
        body: { StartDate: "2025-01-01", EndDate: "2025-12-31" },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("updates season", async () => {
    const res = mockRes();
    models.Seasons.findByPk.mockResolvedValue({
      StartDate: new Date("2025-01-01"),
      EndDate: new Date("2025-12-31"),
    });
    models.Seasons.count.mockResolvedValue(0);
    models.Seasons.update.mockResolvedValue([1]);
    models.Seasons.findByPk.mockResolvedValue({ seasonID: 1 });

    await controller.update(
      {
        params: { id: "1" },
        body: { StartDate: "2025-01-01", EndDate: "2025-12-31" },
      },
      res
    );

    expect(res.json).toHaveBeenCalledWith({ seasonID: 1 });
    expect(t.commit).toHaveBeenCalled();
  });

  it("500 on update error", async () => {
    const res = mockRes();
    models.Seasons.findByPk.mockRejectedValue(new Error());

    await controller.update(
      { params: { id: "1" }, body: {} },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ==========================================================================
// DELETE
// ==========================================================================
describe("seasonsController.delete", () => {
  it("409 when boat storage exists", async () => {
    const res = mockRes();
    models.BoatStorage.count.mockResolvedValue(2);

    await controller.delete({ params: { id: "1" } }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(t.rollback).toHaveBeenCalled();
  });

  it("404 when season not found", async () => {
    const res = mockRes();
    models.BoatStorage.count.mockResolvedValue(0);
    models.Seasons.findByPk.mockResolvedValue(null);

    await controller.delete({ params: { id: "1" } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("deletes season", async () => {
    const res = mockRes();
    models.BoatStorage.count.mockResolvedValue(0);
    models.Seasons.findByPk.mockResolvedValue({ seasonID: 1 });
    models.Seasons.destroy.mockResolvedValue(1);

    await controller.delete({ params: { id: "1" } }, res);

    expect(res.json).toHaveBeenCalledWith({ message: "Season deleted" });
    expect(t.commit).toHaveBeenCalled();
  });

  it("500 on delete error", async () => {
    const res = mockRes();
    models.BoatStorage.count.mockRejectedValue(new Error());

    await controller.delete({ params: { id: "1" } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
