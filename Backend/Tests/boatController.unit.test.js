const mockResponse = require("./mockRes");

jest.mock("uuid", () => ({
  v4: jest.fn(() => "fake-qr-code"),
}));

jest.mock("sequelize", () => {
  const actual = jest.requireActual("sequelize");
  return {
    ...actual,
    Op: {
      lte: Symbol("lte"),
      gte: Symbol("gte"),
    },
  };
});


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
        findOne: jest.fn(),
        create: jest.fn(),
        findAll: jest.fn(),
        findByPk: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn(),
        count: jest.fn(),
      },

      BoatDimensions: {
        create: jest.fn(),
      },

      EngineInformation: {
        create: jest.fn(),
      },

      User: {
        findByPk: jest.fn(),
      },

      Boathalls: {
        findByPk: jest.fn(),
      },
      BoatStorage: {
        findOne: jest.fn(), 
      },


      BoatPosition: {
        findAll: jest.fn(),
        findByPk: jest.fn(),
      },
    },

    __mockTransaction: mockTransaction,
  };
});


const boatsController = require("../Controllers/boatsController");
const { models, __mockTransaction: t } = require("../Database/db");

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------
// CREATE BOAT
// ---------------------------------------------------------------------
describe("boatsController.createBoat", () => {
  it("returns 400 if body is missing boat/dimensions/engine", async () => {
    const req = {
      body: {}, // brak boat, dimensions, engine
      user: { id: 1 },
    };
    const res = mockResponse();

    await boatsController.createBoat(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Body must include boat, dimensions and engine objects",
    });
  });

  it("returns 400 if missing required boat fields", async () => {
    const req = {
      body: {
        boat: {
          name: "Boat 1",
          // brak HIN, Type, Drive, BHID
        },
        dimensions: { Length: 10, Width: 3 },
        engine: {},
      },
      user: { id: 1 },
    };
    const res = mockResponse();

    await boatsController.createBoat(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("Missing boat fields"),
      })
    );
  });

  it("returns 400 if missing required dimension fields", async () => {
    const req = {
      body: {
        boat: {
          name: "Boat 1",
          HIN: "HIN123",
          Type: "Sail",
          BHID: 2,
          Drive: "Motor",
        },
        dimensions: {
          // brak Length, Width
        },
        engine: {},
      },
      user: { id: 1 },
    };
    const res = mockResponse();

    await boatsController.createBoat(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("Missing dimensions fields"),
      })
    );
  });

  it("creates boat, dimensions and engine successfully", async () => {
    const req = {
      body: {
        boat: {
          name: "Boat 1",
          HIN: "HIN123",
          Type: "Sail",
          BHID: 2,
          Drive: "Motor",
        },
        dimensions: {
          Length: 10,
          Width: 3,
          Height: 2,
        },
        engine: {
          Model: "M1",
          Brand: "BrandX",
        },
      },
      user: { id: 42 },
    };
    const res = mockResponse();

    models.Boats.findOne.mockResolvedValue(null); // generateUniqueQR: brak kolizji
    models.Boats.create.mockResolvedValue({ BID: 10 });
    models.BoatDimensions.create.mockResolvedValue({});
    models.EngineInformation.create.mockResolvedValue({});

    await boatsController.createBoat(req, res);

    expect(models.Boats.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Boat 1",
        HIN: "HIN123",
        Type: "Sail",
        BHID: 2,
        Drive: "Motor",
        UID: 42,
        QR: "fake-qr-code",
      }),
      expect.any(Object)
    );
    expect(models.BoatDimensions.create).toHaveBeenCalledWith(
      expect.objectContaining({ BID: 10 }),
      expect.any(Object)
    );
    expect(models.EngineInformation.create).toHaveBeenCalledWith(
      expect.objectContaining({ BID: 10 }),
      expect.any(Object)
    );
    expect(t.commit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Boat created with dimensions and engine",
      BID: 10,
    });
  });

  it("returns 500 on error", async () => {
    const req = {
      body: {
        boat: {
          name: "Boat 1",
          HIN: "HIN123",
          Type: "Sail",
          BHID: 2,
          Drive: "Motor",
        },
        dimensions: { Length: 10, Width: 3 },
        engine: {},
      },
      user: { id: 1 },
    };
    const res = mockResponse();

    models.Boats.findOne.mockRejectedValue(new Error("DB boom"));

    await boatsController.createBoat(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while creating boat",
    });
  });
});

// ---------------------------------------------------------------------
// LIST BOATS
// ---------------------------------------------------------------------
describe("boatsController.listBoats", () => {
  it("lists all boats for admin/employee", async () => {
    const req = { user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    const boats = [{ BID: 1 }, { BID: 2 }];
    models.Boats.findAll.mockResolvedValue(boats);

    await boatsController.listBoats(req, res);

    expect(models.Boats.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      })
    );
    expect(res.json).toHaveBeenCalledWith(boats);
  });

  it("lists only user's boats for client", async () => {
    const req = { user: { role: "Client", id: 99 } };
    const res = mockResponse();

    const boats = [{ BID: 1, UID: 99 }];
    models.Boats.findAll.mockResolvedValue(boats);

    await boatsController.listBoats(req, res);

    expect(models.Boats.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { UID: 99 },
      })
    );
    expect(res.json).toHaveBeenCalledWith(boats);
  });

  it("returns 500 on error", async () => {
    const req = { user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    models.Boats.findAll.mockRejectedValue(new Error("err"));

    await boatsController.listBoats(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while listing boats",
    });
  });
});

// ---------------------------------------------------------------------
// GET ONE BOAT
// ---------------------------------------------------------------------
describe("boatsController.getBoat", () => {
  it("returns 404 when boat not found", async () => {
    const req = { params: { id: "1" }, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue(null);

    await boatsController.getBoat(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Boat not found" });
  });

  it("returns 403 when client is not owner", async () => {
    const req = { params: { id: "1" }, user: { role: "Client", id: 2 } };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue({ BID: 1, UID: 999 });

    await boatsController.getBoat(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "No permission" });
  });

  it("returns boat for admin", async () => {
    const req = { params: { id: "1" }, user: { role: "Admin", id: 2 } };
    const res = mockResponse();

    const boat = { BID: 1, UID: 999 };
    models.Boats.findByPk.mockResolvedValue(boat);

    await boatsController.getBoat(req, res);

    expect(res.json).toHaveBeenCalledWith(boat);
  });

  it("returns 500 on error", async () => {
    const req = { params: { id: "1" }, user: { role: "Admin", id: 2 } };
    const res = mockResponse();

    models.Boats.findByPk.mockRejectedValue(new Error("err"));

    await boatsController.getBoat(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while fetching boat",
    });
  });
});

// ---------------------------------------------------------------------
// GET BOAT BY QR
// ---------------------------------------------------------------------
describe("boatsController.getBoatByQR", () => {
  it("returns 400 when qr is missing", async () => {
    const req = { params: {}, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    await boatsController.getBoatByQR(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Missing QR parameter",
    });
  });

  it("returns 404 when boat not found", async () => {
    const req = { params: { qr: "abc" }, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    models.Boats.findOne.mockResolvedValue(null);

    await boatsController.getBoatByQR(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Boat not found" });
  });

  it("returns 403 when client is not owner", async () => {
    const req = { params: { qr: "abc" }, user: { role: "Client", id: 1 } };
    const res = mockResponse();

    models.Boats.findOne.mockResolvedValue({
      BID: 1,
      UID: 999,
    });

    await boatsController.getBoatByQR(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "No permission" });
  });

  it("returns QR context when allowed", async () => {
  const req = { params: { qr: "abc" }, user: { role: "Admin", id: 1 } };
  const res = mockResponse();

  models.Boats.findOne.mockResolvedValue({ BID: 1, UID: 999 });
  models.BoatStorage.findOne.mockResolvedValue(null);

  await boatsController.getBoatByQR(req, res);

  expect(res.json).toHaveBeenCalledWith({
    BID: 1,
    AID: null,
  });
});
});


  it("returns 500 on error", async () => {
    const req = { params: { qr: "abc" }, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    models.Boats.findOne.mockRejectedValue(new Error("err"));

    await boatsController.getBoatByQR(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while fetching boat by QR",
    });
  });

// ---------------------------------------------------------------------
// UPDATE BOAT
// ---------------------------------------------------------------------
describe("boatsController.updateBoat", () => {
  it("returns 404 when boat not found", async () => {
    const req = { params: { id: "1" }, body: {}, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue(null);

    await boatsController.updateBoat(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Boat not found" });
  });

  it("returns 403 when client is not owner", async () => {
    const req = {
      params: { id: "1" },
      body: {},
      user: { role: "Client", id: 1 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue({ BID: 1, UID: 999 });

    await boatsController.updateBoat(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "No permission" });
  });

  it("updates boat as admin", async () => {
    const req = {
      params: { id: "1" },
      body: { name: "Updated", UID: 111, out: new Date().toISOString() },
      user: { role: "Admin", id: 99 },
    };
    const res = mockResponse();

    models.Boats.findByPk
      .mockResolvedValueOnce({ BID: 1, UID: 50 })
      .mockResolvedValueOnce({ BID: 1, UID: 50, name: "Updated" });

    await boatsController.updateBoat(req, res);

    expect(models.Boats.update).toHaveBeenCalled();
    expect(t.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        BID: 1,
        name: "Updated",
      })
    );
  });

  it("returns 500 on error", async () => {
    const req = {
      params: { id: "1" },
      body: {},
      user: { role: "Admin", id: 1 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockRejectedValue(new Error("err"));

    await boatsController.updateBoat(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while updating boat",
    });
  });
});

// ---------------------------------------------------------------------
// DELETE BOAT
// ---------------------------------------------------------------------
describe("boatsController.deleteBoat", () => {
  it("returns 404 when boat not found", async () => {
    const req = { params: { id: "1" }, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue(null);

    await boatsController.deleteBoat(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Boat not found" });
  });

  it("returns 403 when client not owner", async () => {
    const req = { params: { id: "1" }, user: { role: "Client", id: 1 } };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue({ BID: 1, UID: 999 });

    await boatsController.deleteBoat(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "No permission" });
  });

  it("deletes boat", async () => {
    const req = { params: { id: "1" }, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue({ BID: 1, UID: 50 });

    await boatsController.deleteBoat(req, res);

    expect(models.Boats.destroy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { BID: 1 } })
    );
    expect(t.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: "Boat deleted" });
  });

  it("returns 500 on error", async () => {
    const req = { params: { id: "1" }, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    models.Boats.findByPk.mockRejectedValue(new Error("err"));

    await boatsController.deleteBoat(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while deleting boat",
    });
  });
});

// ---------------------------------------------------------------------
// SET OUT
// ---------------------------------------------------------------------
describe("boatsController.setOut", () => {
  it("returns 404 when boat not found", async () => {
    const req = { params: { id: "1" }, body: { out: new Date().toISOString() }, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue(null);

    await boatsController.setOut(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Boat not found" });
  });

  it("returns 403 when client not owner", async () => {
    const req = { params: { id: "1" }, body: { out: new Date().toISOString() }, user: { role: "Client", id: 1 } };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue({ BID: 1, UID: 999 });

    await boatsController.setOut(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "No permission" });
  });

  it("sets out to null (clears date)", async () => {
    const boat = {
      BID: 1,
      UID: 1,
      out: new Date(),
      save: jest.fn().mockResolvedValue(),
    };
    const req = { params: { id: "1" }, body: { out: null }, user: { role: "Client", id: 1 } };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue(boat);

    await boatsController.setOut(req, res);

    expect(boat.out).toBeNull();
    expect(boat.save).toHaveBeenCalled();
    expect(t.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(boat);
  });

  it("returns 409 when daily limit reached", async () => {
    const boat = {
      BID: 1,
      UID: 1,
      save: jest.fn().mockResolvedValue(),
    };
    const req = {
      params: { id: "1" },
      body: { out: new Date().toISOString() },
      user: { role: "Admin", id: 1 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue(boat);

    // pierwszy count -> perDay, drugi -> conflict (nie dojdzie)
    models.Boats.count.mockResolvedValueOnce(999);

    await boatsController.setOut(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "Daily limit reached please choose another",
    });
  });

  it("returns 409 when slot already taken", async () => {
    const boat = {
      BID: 1,
      UID: 1,
      save: jest.fn().mockResolvedValue(),
    };
    const req = {
      params: { id: "1" },
      body: { out: new Date().toISOString() },
      user: { role: "Admin", id: 1 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue(boat);

    // perDay < limit
    models.Boats.count
      .mockResolvedValueOnce(0) // perDay
      .mockResolvedValueOnce(1); // conflict

    await boatsController.setOut(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "Date taken please choose another",
    });
  });

  it("sets out successfully", async () => {
    const boat = {
      BID: 1,
      UID: 1,
      out: null,
      save: jest.fn().mockResolvedValue(),
    };
    const req = {
      params: { id: "1" },
      body: { out: new Date().toISOString() },
      user: { role: "Admin", id: 1 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue(boat);

    models.Boats.count
      .mockResolvedValueOnce(0) // perDay
      .mockResolvedValueOnce(0); // conflict

    await boatsController.setOut(req, res);

    expect(boat.save).toHaveBeenCalled();
    expect(t.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(boat);
  });

  it("returns 500 on error", async () => {
    const req = {
      params: { id: "1" },
      body: { out: new Date().toISOString() },
      user: { role: "Admin", id: 1 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockRejectedValue(new Error("err"));

    await boatsController.setOut(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while setting out",
    });
  });

  
});

describe("boatsController.getBoatQRContext", () => {
  it("400 when QR missing", async () => {
    const req = {
      params: {},
      user: { role: "Admin", id: 1 },
    };
    const res = mockResponse();

    await boatsController.getBoatQRContext(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Missing QR" });
  });

  it("404 when boat not found", async () => {
    const req = {
      params: { qr: "abc" },
      user: { role: "Admin", id: 1 },
    };
    const res = mockResponse();

    models.Boats.findOne.mockResolvedValue(null);

    await boatsController.getBoatQRContext(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Boat not found" });
  });

  it("403 when client not owner", async () => {
    const req = {
      params: { qr: "abc" },
      user: { role: "Client", id: 1 },
    };
    const res = mockResponse();

    models.Boats.findOne.mockResolvedValue({
      BID: 10,
      UID: 999,
    });

    await boatsController.getBoatQRContext(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
  });

  it("returns BID and AID when active storage exists", async () => {
    const req = {
      params: { qr: "abc" },
      user: { role: "Client", id: 5 },
    };
    const res = mockResponse();

    models.Boats.findOne.mockResolvedValue({
      BID: 10,
      UID: 5,
    });

    models.BoatStorage.findOne.mockResolvedValue({
      AID: 77,
    });

    await boatsController.getBoatQRContext(req, res);

    expect(res.json).toHaveBeenCalledWith({
      BID: 10,
      AID: 77,
    });
  });

  it("returns BID and null AID when no active storage", async () => {
    const req = {
      params: { qr: "abc" },
      user: { role: "Admin", id: 1 },
    };
    const res = mockResponse();

    models.Boats.findOne.mockResolvedValue({
      BID: 10,
      UID: 999,
    });

    models.BoatStorage.findOne.mockResolvedValue(null);

    await boatsController.getBoatQRContext(req, res);

    expect(res.json).toHaveBeenCalledWith({
      BID: 10,
      AID: null,
    });
  });

  it("500 on unexpected error", async () => {
    const req = {
      params: { qr: "abc" },
      user: { role: "Admin", id: 1 },
    };
    const res = mockResponse();

    models.Boats.findOne.mockRejectedValue(new Error("db"));

    await boatsController.getBoatQRContext(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "QR context error" });
  });
});
