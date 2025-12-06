const boatStorageController = require("../Controllers/boatStorageController");
const mockRes = require("./mockRes");

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
      Boats: {
        findByPk: jest.fn(),
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
    __mockTransaction: mockTransaction,
  };
});

const { models, __mockTransaction: t } = require("../Database/db");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("boatStorageController.create", () => {
  test("creates storage entry successfully", async () => {
    const req = {
      body: { BID: 5, seasonID: 2, IsComing: true, Budget: 100 },
    };
    const res = mockRes();

    models.Boats.findByPk.mockResolvedValue({ BID: 5 });
    models.Seasons.findByPk.mockResolvedValue({ seasonID: 2 });
    models.BoatStorage.findOne.mockResolvedValue(null);
    models.BoatStorage.create.mockResolvedValue({ AID: 10 });

    await boatStorageController.create(req, res);

    expect(models.BoatStorage.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("returns 400 if BID or seasonID missing", async () => {
    const req = { body: {} };
    const res = mockRes();

    await boatStorageController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 404 if boat not found", async () => {
    const req = { body: { BID: 5, seasonID: 2 } };
    const res = mockRes();

    models.Boats.findByPk.mockResolvedValue(null);

    await boatStorageController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("returns 404 if season not found", async () => {
    const req = { body: { BID: 5, seasonID: 2 } };
    const res = mockRes();

    models.Boats.findByPk.mockResolvedValue({ BID: 5 });
    models.Seasons.findByPk.mockResolvedValue(null);

    await boatStorageController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("returns 409 if storage for boat+season exists", async () => {
    const req = { body: { BID: 5, seasonID: 2 } };
    const res = mockRes();

    models.Boats.findByPk.mockResolvedValue({ BID: 5 });
    models.Seasons.findByPk.mockResolvedValue({ seasonID: 2 });
    models.BoatStorage.findOne.mockResolvedValue({ AID: 1 });

    await boatStorageController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  test("returns 400 for invalid budget", async () => {
    const req = { body: { BID: 5, seasonID: 2, Budget: -10 } };
    const res = mockRes();

    models.Boats.findByPk.mockResolvedValue({ BID: 5 });
    models.Seasons.findByPk.mockResolvedValue({ seasonID: 2 });
    models.BoatStorage.findOne.mockResolvedValue(null);

    await boatStorageController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 500 on DB error", async () => {
    const req = { body: { BID: 5, seasonID: 2 } };
    const res = mockRes();

    models.Boats.findByPk.mockRejectedValue(new Error("fail"));

    await boatStorageController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("boatStorageController.list", () => {
  test("returns list successfully", async () => {
    const req = {};
    const res = mockRes();

    models.BoatStorage.findAll.mockResolvedValue([{ AID: 1 }]);

    await boatStorageController.list(req, res);

    expect(res.json).toHaveBeenCalledWith([{ AID: 1 }]);
  });

  test("handles server error", async () => {
    const req = {};
    const res = mockRes();

    models.BoatStorage.findAll.mockRejectedValue(new Error("boom"));

    await boatStorageController.list(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("boatStorageController.mine", () => {
  test("admin gets all entries", async () => {
    const req = { user: { role: "Admin" } };
    const res = mockRes();

    models.BoatStorage.findAll.mockResolvedValue([{ AID: 3 }]);

    await boatStorageController.mine(req, res);
    expect(res.json).toHaveBeenCalledWith([{ AID: 3 }]);
  });

  test("user gets only his own entries", async () => {
    const req = { user: { role: "Client", id: 99 } };
    const res = mockRes();

    models.BoatStorage.findAll.mockResolvedValue([{ AID: 4 }]);

    await boatStorageController.mine(req, res);
    expect(models.BoatStorage.findAll).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith([{ AID: 4 }]);
  });

  test("handles error", async () => {
    const req = { user: { role: "Client", id: 99 } };
    const res = mockRes();

    models.BoatStorage.findAll.mockRejectedValue(new Error());

    await boatStorageController.mine(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("boatStorageController.getOne", () => {
  test("returns record", async () => {
    const req = { params: { id: 1 } };
    const res = mockRes();

    models.BoatStorage.findByPk.mockResolvedValue({ AID: 1 });

    await boatStorageController.getOne(req, res);

    expect(res.json).toHaveBeenCalledWith({ AID: 1 });
  });

  test("404 if not found", async () => {
    const req = { params: { id: 1 } };
    const res = mockRes();

    models.BoatStorage.findByPk.mockResolvedValue(null);

    await boatStorageController.getOne(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("500 on error", async () => {
    const req = { params: { id: 1 } };
    const res = mockRes();

    models.BoatStorage.findByPk.mockRejectedValue(new Error());

    await boatStorageController.getOne(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("boatStorageController.update", () => {
  test("updates successfully", async () => {
    const req = { params: { id: 1 }, body: { Budget: 200 } };
    const res = mockRes();

    models.BoatStorage.findByPk.mockResolvedValue({ AID: 1 });
    models.BoatStorage.update.mockResolvedValue({});
    models.BoatStorage.findByPk.mockResolvedValue({ AID: 1, Budget: 200 });

    await boatStorageController.update(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  test("404 if not found", async () => {
    const req = { params: { id: 1 }, body: {} };
    const res = mockRes();

    models.BoatStorage.findByPk.mockResolvedValue(null);

    await boatStorageController.update(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("400 invalid budget", async () => {
    const req = { params: { id: 1 }, body: { Budget: -10 } };
    const res = mockRes();

    models.BoatStorage.findByPk.mockResolvedValue({ AID: 1 });

    await boatStorageController.update(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("500 on error", async () => {
    const req = { params: { id: 1 }, body: {} };
    const res = mockRes();

    models.BoatStorage.findByPk.mockRejectedValue(new Error());

    await boatStorageController.update(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("boatStorageController.delete", () => {
  test("deletes successfully", async () => {
    const req = { params: { id: 1 } };
    const res = mockRes();

    models.BoatStorage.findByPk.mockResolvedValue({ AID: 1 });
    models.BoatStorage.destroy.mockResolvedValue(1);

    await boatStorageController.delete(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  test("404 if not found", async () => {
    const req = { params: { id: 1 } };
    const res = mockRes();

    models.BoatStorage.findByPk.mockResolvedValue(null);

    await boatStorageController.delete(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("500 on error", async () => {
    const req = { params: { id: 1 } };
    const res = mockRes();

    models.BoatStorage.findByPk.mockRejectedValue(new Error());

    await boatStorageController.delete(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("boatStorageController.updateBudget", () => {
  test("staff can set any budget", async () => {
    const req = { params: { id: 1 }, user: { role: "Admin" }, body: { Budget: 300 } };
    const res = mockRes();

    models.BoatStorage.findByPk.mockResolvedValue({ 
      AID: 1, 
      Budget: 100, 
      Boat: { UID: 99 },
      save: jest.fn()
    });

    await boatStorageController.updateBudget(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  test("client cannot decrease budget", async () => {
    const req = {
      params: { id: 1 },
      user: { role: "Client", id: 5 },
      body: { Budget: 50 }
    };
    const res = mockRes();

    models.BoatStorage.findByPk.mockResolvedValue({
      AID: 1,
      Budget: 100,
      Boat: { UID: 5 },
      save: jest.fn()
    });

    await boatStorageController.updateBudget(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("403 if user is not owner", async () => {
    const req = {
      params: { id: 1 },
      user: { role: "Client", id: 8 },
      body: { Budget: 200 }
    };
    const res = mockRes();

    models.BoatStorage.findByPk.mockResolvedValue({
      AID: 1,
      Budget: 100,
      Boat: { UID: 5 },
    });

    await boatStorageController.updateBudget(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("400 invalid client budget (null)", async () => {
    const req = {
      params: { id: 1 },
      user: { role: "Client", id: 5 },
      body: { Budget: null }
    };
    const res = mockRes();

    models.BoatStorage.findByPk.mockResolvedValue({
      AID: 1,
      Budget: 100,
      Boat: { UID: 5 },
    });

    await boatStorageController.updateBudget(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("500 on error", async () => {
    const req = { params: { id: 1 }, user: { role: "Admin" }, body: { Budget: 200 } };
    const res = mockRes();

    models.BoatStorage.findByPk.mockRejectedValue(new Error());

    await boatStorageController.updateBudget(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
