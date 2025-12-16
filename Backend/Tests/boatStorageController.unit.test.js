const boatStorageController = require("../Controllers/boatStorageController");
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
      query: jest.fn(),
    },
    models: {
      Boats: {
        findByPk: jest.fn(),
        findOne: jest.fn(),
      },
      Seasons: {
        findByPk: jest.fn(),
      },
      BoatStorage: {
        findOne: jest.fn(),
        findAll: jest.fn(),
        findByPk: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn(),
      },
    },
    __t: t,
  };
});

const { models, sequelize, __t: t } = require("../Database/db");

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

// ==========================================================================
// CREATE
// ==========================================================================
describe("boatStorageController.create", () => {
  it("400 missing BID/seasonID", async () => {
    const res = mockRes();
    await boatStorageController.create({ body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(t.rollback).toHaveBeenCalled();
  });

  it("404 boat not found", async () => {
    const res = mockRes();
    models.Boats.findByPk.mockResolvedValue(null);

    await boatStorageController.create({ body: { BID: 1, seasonID: 2 } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("404 season not found", async () => {
    const res = mockRes();
    models.Boats.findByPk.mockResolvedValue({});
    models.Seasons.findByPk.mockResolvedValue(null);

    await boatStorageController.create({ body: { BID: 1, seasonID: 2 } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("409 storage already exists", async () => {
    const res = mockRes();
    models.Boats.findByPk.mockResolvedValue({});
    models.Seasons.findByPk.mockResolvedValue({});
    models.BoatStorage.findOne.mockResolvedValue({ AID: 1 });

    await boatStorageController.create({ body: { BID: 1, seasonID: 2 } }, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("400 invalid budget", async () => {
    const res = mockRes();
    models.Boats.findByPk.mockResolvedValue({});
    models.Seasons.findByPk.mockResolvedValue({});
    models.BoatStorage.findOne.mockResolvedValue(null);

    await boatStorageController.create(
      { body: { BID: 1, seasonID: 2, Budget: -5 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("creates storage entry (happy path)", async () => {
    const res = mockRes();
    models.Boats.findByPk.mockResolvedValue({});
    models.Seasons.findByPk.mockResolvedValue({});
    models.BoatStorage.findOne.mockResolvedValue(null);
    models.BoatStorage.create.mockResolvedValue({ AID: 10 });

    await boatStorageController.create(
      { body: { BID: 1, seasonID: 2, Budget: 100 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(t.commit).toHaveBeenCalled();
  });

  it("500 on unexpected error", async () => {
    const res = mockRes();
    models.Boats.findByPk.mockRejectedValue(new Error("db"));

    await boatStorageController.create(
      { body: { BID: 1, seasonID: 2 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ==========================================================================
// LIST
// ==========================================================================
describe("boatStorageController.list", () => {
  it("returns list", async () => {
    const res = mockRes();
    models.BoatStorage.findAll.mockResolvedValue([{ AID: 1 }]);

    await boatStorageController.list({}, res);

    expect(res.json).toHaveBeenCalledWith([{ AID: 1 }]);
  });

  it("500 on error", async () => {
    const res = mockRes();
    models.BoatStorage.findAll.mockRejectedValue(new Error());

    await boatStorageController.list({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ==========================================================================
// LIST LIGHT
// ==========================================================================
describe("boatStorageController.listLight", () => {
  it("returns rows", async () => {
    const res = mockRes();
    sequelize.query.mockResolvedValue([{ AID: 1 }]);

    await boatStorageController.listLight({}, res);

    expect(res.json).toHaveBeenCalledWith([{ AID: 1 }]);
  });

  it("500 on error", async () => {
    const res = mockRes();
    sequelize.query.mockRejectedValue(new Error());

    await boatStorageController.listLight({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ==========================================================================
// BY BOAT
// ==========================================================================
describe("boatStorageController.byBoat", () => {
  it("400 invalid BID", async () => {
    const res = mockRes();
    await boatStorageController.byBoat(
      { params: { bid: "x" }, user: { role: "Admin" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("403 client not owner", async () => {
    const res = mockRes();
    models.Boats.findOne.mockResolvedValue(null);

    await boatStorageController.byBoat(
      { params: { bid: "1" }, user: { role: "Client", id: 5 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns list for staff", async () => {
    const res = mockRes();
    models.BoatStorage.findAll.mockResolvedValue([{ AID: 1 }]);

    await boatStorageController.byBoat(
      { params: { bid: "1" }, user: { role: "Admin" } },
      res
    );

    expect(res.json).toHaveBeenCalledWith([{ AID: 1 }]);
  });

  it("500 on error", async () => {
    const res = mockRes();
    models.BoatStorage.findAll.mockRejectedValue(new Error());

    await boatStorageController.byBoat(
      { params: { bid: "1" }, user: { role: "Admin" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ==========================================================================
// MINE
// ==========================================================================
describe("boatStorageController.mine", () => {
  it("admin gets all", async () => {
    const res = mockRes();
    models.BoatStorage.findAll.mockResolvedValue([{ AID: 1 }]);

    await boatStorageController.mine({ user: { role: "Admin" } }, res);

    expect(res.json).toHaveBeenCalled();
  });

  it("client gets own", async () => {
    const res = mockRes();
    models.BoatStorage.findAll.mockResolvedValue([{ AID: 2 }]);

    await boatStorageController.mine(
      { user: { role: "Client", id: 9 } },
      res
    );

    expect(res.json).toHaveBeenCalled();
  });

  it("500 on error", async () => {
    const res = mockRes();
    models.BoatStorage.findAll.mockRejectedValue(new Error());

    await boatStorageController.mine(
      { user: { role: "Client", id: 9 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ==========================================================================
// GET ONE
// ==========================================================================
describe("boatStorageController.getOne", () => {
  it("400 invalid id", async () => {
    const res = mockRes();
    await boatStorageController.getOne(
      { params: { id: "x" }, user: { role: "Admin" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("404 not found", async () => {
    const res = mockRes();
    models.BoatStorage.findByPk.mockResolvedValue(null);

    await boatStorageController.getOne(
      { params: { id: "1" }, user: { role: "Admin" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("403 client forbidden", async () => {
    const res = mockRes();
    models.BoatStorage.findByPk.mockResolvedValue({
      Boat: { UID: 9 },
    });

    await boatStorageController.getOne(
      { params: { id: "1" }, user: { role: "Client", id: 5 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns record", async () => {
    const res = mockRes();
    models.BoatStorage.findByPk.mockResolvedValue({
      Boat: { UID: 5 },
    });

    await boatStorageController.getOne(
      { params: { id: "1" }, user: { role: "Client", id: 5 } },
      res
    );

    expect(res.json).toHaveBeenCalled();
  });
});

// ==========================================================================
// UPDATE
// ==========================================================================
describe("boatStorageController.update", () => {
  it("404 not found", async () => {
    const res = mockRes();
    models.BoatStorage.findByPk.mockResolvedValue(null);

    await boatStorageController.update(
      { params: { id: "1" }, body: {} },
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("400 invalid budget", async () => {
    const res = mockRes();
    models.BoatStorage.findByPk.mockResolvedValue({});

    await boatStorageController.update(
      { params: { id: "1" }, body: { Budget: -1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("updates entry", async () => {
    const res = mockRes();
    models.BoatStorage.findByPk.mockResolvedValue({ AID: 1 });
    models.BoatStorage.update.mockResolvedValue();
    models.BoatStorage.findByPk.mockResolvedValue({ AID: 1, Budget: 10 });

    await boatStorageController.update(
      { params: { id: "1" }, body: { Budget: 10 } },
      res
    );

    expect(res.json).toHaveBeenCalled();
    expect(t.commit).toHaveBeenCalled();
  });
});

// ==========================================================================
// DELETE
// ==========================================================================
describe("boatStorageController.delete", () => {
  it("404 not found", async () => {
    const res = mockRes();
    models.BoatStorage.findByPk.mockResolvedValue(null);

    await boatStorageController.delete(
      { params: { id: "1" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("deletes entry", async () => {
    const res = mockRes();
    models.BoatStorage.findByPk.mockResolvedValue({ AID: 1 });
    models.BoatStorage.destroy.mockResolvedValue(1);

    await boatStorageController.delete(
      { params: { id: "1" } },
      res
    );

    expect(res.json).toHaveBeenCalled();
    expect(t.commit).toHaveBeenCalled();
  });
});

// ==========================================================================
// UPDATE BUDGET
// ==========================================================================
describe("boatStorageController.updateBudget", () => {
  it("400 invalid budget", async () => {
    const res = mockRes();

    await boatStorageController.updateBudget(
      { params: { id: "1" }, user: { role: "Admin" }, body: { Budget: -1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("404 not found", async () => {
    const res = mockRes();
    models.BoatStorage.findByPk.mockResolvedValue(null);

    await boatStorageController.updateBudget(
      { params: { id: "1" }, user: { role: "Admin" }, body: { Budget: 10 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("403 not owner", async () => {
    const res = mockRes();
    models.BoatStorage.findByPk.mockResolvedValue({
      Boat: { UID: 9 },
    });

    await boatStorageController.updateBudget(
      { params: { id: "1" }, user: { role: "Client", id: 5 }, body: { Budget: 20 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("400 client cannot decrease budget", async () => {
    const res = mockRes();
    models.BoatStorage.findByPk.mockResolvedValue({
      Budget: 100,
      Boat: { UID: 5 },
      save: jest.fn(),
    });

    await boatStorageController.updateBudget(
      { params: { id: "1" }, user: { role: "Client", id: 5 }, body: { Budget: 50 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("client increases budget", async () => {
    const res = mockRes();
    const rec = {
      AID: 1,
      Budget: 100,
      Boat: { UID: 5 },
      save: jest.fn(),
    };
    models.BoatStorage.findByPk.mockResolvedValue(rec);

    await boatStorageController.updateBudget(
      { params: { id: "1" }, user: { role: "Client", id: 5 }, body: { Budget: 150 } },
      res
    );

    expect(rec.save).toHaveBeenCalled();
    expect(t.commit).toHaveBeenCalled();
  });

  it("staff sets any budget", async () => {
    const res = mockRes();
    const rec = {
      AID: 1,
      Budget: 50,
      Boat: { UID: 9 },
      save: jest.fn(),
    };
    models.BoatStorage.findByPk.mockResolvedValue(rec);

    await boatStorageController.updateBudget(
      { params: { id: "1" }, user: { role: "Admin" }, body: { Budget: null } },
      res
    );

    expect(rec.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
  });
});
