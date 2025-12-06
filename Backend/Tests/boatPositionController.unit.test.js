const boatPositionsController = require("../Controllers/boatPositionsController");
const mockResponse = require("./mockRes");


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
      BoatDimensions: {
        findOne: jest.fn(),
      },
      Boathalls: {
        findByPk: jest.fn(),
      },
      Boats: {
        findByPk: jest.fn(),
        findAll: jest.fn(),
        count: jest.fn(),
      },
      BoatPosition: {
        findAll: jest.fn(),
        findOne: jest.fn(),
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

// wyciszamy console.error, żeby logi z błędów nie spamowały testów
beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

//
// CREATE
//
describe("boatPositionsController.create", () => {
  it("should return 400 when required fields are missing", async () => {
    const req = { body: { BHID: 1, BID: 2, PosX: 10 } }; // brak PosY
    const res = mockResponse();

    await boatPositionsController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "BHID, BID, PosX, PosY are required",
    });
  });

  it("should return 404 when boat not found", async () => {
    const req = {
      body: { BHID: 1, BID: 2, PosX: 10, PosY: 20 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue(null);

    await boatPositionsController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Boat not found" });
  });

  it("should return 400 when boat BHID does not match position BHID", async () => {
    const req = {
      body: { BHID: 1, BID: 2, PosX: 10, PosY: 20 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue({ BID: 2, BHID: 999 });

    await boatPositionsController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Boat BHID does not match position BHID",
    });
  });

  it("should return 409 when position already exists for this boat", async () => {
    const req = {
      body: { BHID: 1, BID: 2, PosX: 10, PosY: 20 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue({ BID: 2, BHID: 1 });
    models.BoatPosition.findOne.mockResolvedValue({ PositionID: 123 });

    await boatPositionsController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "Position already exists for this boat",
    });
  });

  it("should return 400 when missing boat dimensions", async () => {
    const req = {
      body: { BHID: 1, BID: 2, PosX: 10, PosY: 20 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue({ BID: 2, BHID: 1 });
    models.BoatPosition.findOne.mockResolvedValue(null);
    // paddedDimsForBoat -> BoatDimensions.findOne returns null
    models.BoatDimensions.findOne.mockResolvedValue(null);
    models.Boathalls.findByPk.mockResolvedValue({ Width: 100, Length: 100 });

    await boatPositionsController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Missing boat dimensions",
    });
  });

  it("should create position successfully", async () => {
    const req = {
      body: { BHID: 1, BID: 2, PosX: 10, PosY: 20 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue({ BID: 2, BHID: 1 });
    models.BoatPosition.findOne.mockResolvedValue(null);

    // paddedDimsForBoat
    models.BoatDimensions.findOne.mockResolvedValue({
      Length: 10,
      Width: 5,
    });
    models.Boathalls.findByPk.mockResolvedValue({
      Width: 100,
      Length: 100,
      MarginCM: 5,
    });

    // validateRect -> BoatPosition.findAll zwraca nic
    models.BoatPosition.findAll.mockResolvedValue([]);

    const created = {
      toJSON: () => ({
        PositionID: 1,
        BHID: 1,
        BID: 2,
        PosX: 10,
        PosY: 20,
        Length: 15,
        Width: 10,
      }),
    };

    models.BoatPosition.create.mockResolvedValue(created);

    await boatPositionsController.create(req, res);

    expect(models.BoatPosition.create).toHaveBeenCalled();
    expect(t.commit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        PositionID: 1,
        BHID: 1,
        BID: 2,
        MarginCM: 5,
      })
    );
  });

  it("should return 500 on error", async () => {
    const req = {
      body: { BHID: 1, BID: 2, PosX: 10, PosY: 20 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockRejectedValue(new Error("boom"));

    await boatPositionsController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while creating position",
    });
  });
});

//
// UPDATE
//
describe("boatPositionsController.update", () => {
  it("should return 404 when position not found", async () => {
    const req = { params: { id: "1" }, body: {} };
    const res = mockResponse();

    models.BoatPosition.findByPk.mockResolvedValue(null);

    await boatPositionsController.update(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "Position not found",
    });
  });

  it("should return 404 when boat not found", async () => {
    const req = { params: { id: "1" }, body: {} };
    const res = mockResponse();

    models.BoatPosition.findByPk.mockResolvedValue({
      PositionID: 1,
      BHID: 1,
      BID: 2,
      PosX: 10,
      PosY: 20,
    });

    models.Boats.findByPk.mockResolvedValue(null);

    await boatPositionsController.update(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "Boat not found",
    });
  });

  it("should return 400 when boat BHID does not match", async () => {
    const req = { params: { id: "1" }, body: { BHID: 1 } };
    const res = mockResponse();

    models.BoatPosition.findByPk.mockResolvedValue({
      PositionID: 1,
      BHID: 1,
      BID: 2,
      PosX: 10,
      PosY: 20,
    });

    models.Boats.findByPk.mockResolvedValue({
      BID: 2,
      BHID: 99,
    });

    await boatPositionsController.update(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Boat BHID does not match position BHID",
    });
  });

  it("should return 400 when missing dimensions", async () => {
    const req = { params: { id: "1" }, body: {} };
    const res = mockResponse();

    models.BoatPosition.findByPk.mockResolvedValue({
      PositionID: 1,
      BHID: 1,
      BID: 2,
      PosX: 10,
      PosY: 20,
    });

    models.Boats.findByPk.mockResolvedValue({
      BID: 2,
      BHID: 1,
    });

    models.BoatDimensions.findOne.mockResolvedValue(null);
    models.Boathalls.findByPk.mockResolvedValue({ Width: 100, Length: 100 });

    await boatPositionsController.update(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Missing boat dimensions",
    });
  });

  it("should update position successfully", async () => {
    const req = { params: { id: "1" }, body: { PosX: 50 } };
    const res = mockResponse();

    models.BoatPosition.findByPk.mockResolvedValueOnce({
      PositionID: 1,
      BHID: 1,
      BID: 2,
      PosX: 10,
      PosY: 20,
    });

    models.Boats.findByPk.mockResolvedValue({
      BID: 2,
      BHID: 1,
    });

    models.BoatDimensions.findOne.mockResolvedValue({
      Length: 10,
      Width: 5,
    });

    models.Boathalls.findByPk.mockResolvedValue({
      Width: 200,
      Length: 200,
      MarginCM: 5,
    });

    models.BoatPosition.findAll.mockResolvedValue([]);

    const refreshed = {
      toJSON: () => ({
        PositionID: 1,
        BHID: 1,
        BID: 2,
        PosX: 50,
        PosY: 20,
        Length: 15,
        Width: 10,
      }),
    };

    models.BoatPosition.findByPk.mockResolvedValueOnce(refreshed);

    await boatPositionsController.update(req, res);

    expect(models.BoatPosition.update).toHaveBeenCalled();
    expect(t.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        PositionID: 1,
        MarginCM: 5,
        PosX: 50,
      })
    );
  });

  it("should return 500 on error", async () => {
    const req = { params: { id: "1" }, body: {} };
    const res = mockResponse();

    models.BoatPosition.findByPk.mockRejectedValue(new Error("err"));

    await boatPositionsController.update(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while updating position",
    });
  });
});

//
// REMOVE
//
describe("boatPositionsController.remove", () => {
  it("should return 404 if position not found", async () => {
    const req = { params: { id: "1" } };
    const res = mockResponse();

    models.BoatPosition.findByPk.mockResolvedValue(null);

    await boatPositionsController.remove(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "Position not found",
    });
  });

  it("should delete position", async () => {
    const req = { params: { id: "1" } };
    const res = mockResponse();

    models.BoatPosition.findByPk.mockResolvedValue({ PositionID: 1 });

    await boatPositionsController.remove(req, res);

    expect(models.BoatPosition.destroy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { PositionID: 1 },
      })
    );
    expect(t.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: "Position deleted" });
  });

  it("should return 500 on error", async () => {
    const req = { params: { id: "1" } };
    const res = mockResponse();

    models.BoatPosition.findByPk.mockRejectedValue(new Error("err"));

    await boatPositionsController.remove(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while deleting position",
    });
  });
});

//
// listByHall
//
describe("boatPositionsController.listByHall", () => {
  it("should return list", async () => {
    const req = { params: { bhid: "1" } };
    const res = mockResponse();

    const list = [{ PositionID: 1 }];
    models.BoatPosition.findAll.mockResolvedValue(list);

    await boatPositionsController.listByHall(req, res);

    expect(models.BoatPosition.findAll).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(list);
  });

  it("should return 500 on error", async () => {
    const req = { params: { bhid: "1" } };
    const res = mockResponse();

    models.BoatPosition.findAll.mockRejectedValue(new Error("err"));

    await boatPositionsController.listByHall(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while listing positions",
    });
  });
});

//
// getByBoat
//
describe("boatPositionsController.getByBoat", () => {
  it("should return 404 if not found", async () => {
    const req = { params: { bid: "1" }, user: { role: "Admin" } };
    const res = mockResponse();

    models.BoatPosition.findOne.mockResolvedValue(null);

    await boatPositionsController.getByBoat(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "Position not found",
    });
  });

  it("should return 403 if client not owner", async () => {
    const req = { params: { bid: "1" }, user: { role: "Client", id: 5 } };
    const res = mockResponse();

    models.BoatPosition.findOne.mockResolvedValue({
      Boat: { UID: 99 },
    });

    await boatPositionsController.getByBoat(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "Forbidden",
    });
  });

  it("should return position for staff", async () => {
    const req = { params: { bid: "1" }, user: { role: "Admin", id: 5 } };
    const res = mockResponse();

    const pos = { PositionID: 1 };
    models.BoatPosition.findOne.mockResolvedValue(pos);

    await boatPositionsController.getByBoat(req, res);

    expect(res.json).toHaveBeenCalledWith(pos);
  });

  it("should return 500 on error", async () => {
    const req = { params: { bid: "1" }, user: { role: "Admin", id: 5 } };
    const res = mockResponse();

    models.BoatPosition.findOne.mockRejectedValue(new Error("err"));

    await boatPositionsController.getByBoat(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while getting position",
    });
  });
});

//
// simulate (basic)
//
describe("boatPositionsController.simulate", () => {
  it("should return 404 if hall not found", async () => {
    const req = { params: { bhid: "1" } };
    const res = mockResponse();

    models.Boathalls.findByPk.mockResolvedValue(null);

    await boatPositionsController.simulate(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "Boathall not found",
    });
  });

  it("should simulate positions successfully", async () => {
    const req = { params: { bhid: "1" } };
    const res = mockResponse();

    models.Boathalls.findByPk.mockResolvedValue({
      BHID: 1,
      Width: 100,
      Length: 100,
      MarginCM: 5,
    });

    models.Boats.findAll.mockResolvedValue([
      {
        BID: 1,
        BoatDimension: { Length: 10, Width: 10 },
      },
      {
        BID: 2,
        BoatDimension: { Length: 5, Width: 5 },
      },
    ]);

    await boatPositionsController.simulate(req, res);

    expect(t.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        hall: expect.objectContaining({
          BHID: 1,
          Width: 100,
          Length: 100,
        }),
        placed: expect.any(Array),
      })
    );
  });
});

//
// optimize (średni zakres)
//
describe("boatPositionsController.optimize", () => {
  it("should return 400 when placements array missing", async () => {
    const req = { params: { bhid: "1" }, body: {} };
    const res = mockResponse();

    await boatPositionsController.optimize(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "placements array is required",
    });
  });

  it("should return 404 when hall not found", async () => {
    const req = {
      params: { bhid: "1" },
      body: { placements: [{ BID: 1, PosX: 0, PosY: 0 }] },
    };
    const res = mockResponse();

    models.Boathalls.findByPk.mockResolvedValue(null);

    await boatPositionsController.optimize(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "Boathall not found",
    });
  });

  it("should return 400 when boat has no dimensions", async () => {
    const req = {
      params: { bhid: "1" },
      body: { placements: [{ BID: 1, PosX: 0, PosY: 0 }] },
    };
    const res = mockResponse();

    models.Boathalls.findByPk.mockResolvedValue({
      BHID: 1,
      Width: 100,
      Length: 100,
      MarginCM: 5,
    });

    models.Boats.findByPk.mockResolvedValue({
      BID: 1,
      BHID: 1,
    });

    models.BoatDimensions.findOne.mockResolvedValue(null);

    await boatPositionsController.optimize(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Missing dimensions for boat 1",
    });
  });

  it("should optimize positions successfully", async () => {
    const req = {
      params: { bhid: "1" },
      body: {
        placements: [{ BID: 1, PosX: 0, PosY: 0 }],
        replaceAll: true,
      },
    };
    const res = mockResponse();

    models.Boathalls.findByPk.mockResolvedValue({
      BHID: 1,
      Width: 100,
      Length: 100,
      MarginCM: 5,
    });

    models.Boats.findByPk.mockResolvedValue({
      BID: 1,
      BHID: 1,
    });

    models.BoatDimensions.findOne.mockResolvedValue({
      Length: 10,
      Width: 10,
    });

    // brak istniejącej pozycji -> create
    models.BoatPosition.findOne.mockResolvedValue(null);

    await boatPositionsController.optimize(req, res);

    expect(models.BoatPosition.destroy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { BHID: 1 },
      })
    );
    expect(models.BoatPosition.create).toHaveBeenCalled();
    expect(t.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Positions optimized",
        count: 1,
      })
    );
  });

  it("should return 500 on error", async () => {
    const req = {
      params: { bhid: "1" },
      body: { placements: [{ BID: 1, PosX: 0, PosY: 0 }] },
    };
    const res = mockResponse();

    models.Boathalls.findByPk.mockRejectedValue(new Error("err"));

    await boatPositionsController.optimize(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while optimizing positions",
    });
  });
});
