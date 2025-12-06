// Backend/Tests/engineController.unit.test.js
const mockResponse = require("./mockRes");
const engineController = require("../Controllers/engineInformationController");

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
      EngineInformation: {
        findOne: jest.fn(),
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
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

// ===========================================================================
// CREATE
// ===========================================================================
describe("engineController.create", () => {
  it("returns 400 if BID is missing", async () => {
    const req = { body: {}, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    await engineController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "BID is required" });
  });

  it("returns 404 if boat not found", async () => {
    const req = { body: { BID: 5 }, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue(null);

    await engineController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Boat not found" });
  });

  it("returns 403 if client is not owner", async () => {
    const req = { body: { BID: 5 }, user: { role: "Client", id: 99 } };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue({ BID: 5, UID: 321 });

    await engineController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
  });

  it("returns 409 if engine already exists", async () => {
    const req = { body: { BID: 5 }, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue({ BID: 5, UID: 1 });
    models.EngineInformation.findOne.mockResolvedValue({ BID: 5 });

    await engineController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "Engine information already exists for this boat",
    });
  });

  it("returns 400 if a required field is missing", async () => {
    const req = {
      body: { BID: 5, Model: "X" }, // reszta pól brak
      user: { role: "Admin", id: 1 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue({ BID: 5, UID: 1 });
    models.EngineInformation.findOne.mockResolvedValue(null);

    await engineController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("Field"),
      })
    );
  });

  it("creates engine info successfully", async () => {
    const req = {
      body: {
        BID: 5,
        Model: "M",
        Brand: "B",
        Engine_nr: "1",
        Reversing_gear: "Y",
        Reversing_gear_nr: "2",
        Sterndrive: "S",
        Sterndrive_nr: "3",
        Transom: "T",
        Transom_nr: "4",
        BT: "yes",
        ST: "no",
        Moto_H: 500,
      },
      user: { role: "Admin", id: 1 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue({ BID: 5, UID: 1 });
    models.EngineInformation.findOne.mockResolvedValue(null);
    models.EngineInformation.create.mockResolvedValue({ BID: 5 });

    await engineController.create(req, res);

    expect(models.EngineInformation.create).toHaveBeenCalled();
    expect(t.commit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ BID: 5 });
  });

  it("returns 500 on error", async () => {
    const req = { body: { BID: 5 }, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    models.Boats.findByPk.mockRejectedValue(new Error("fail"));

    await engineController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Server error while creating engine information",
      })
    );
  });
});

// ===========================================================================
// GET BY BOAT
// ===========================================================================
describe("engineController.getByBoat", () => {
  it("returns 404 if not found", async () => {
    const req = { params: { bid: "5" }, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    models.EngineInformation.findOne.mockResolvedValue(null);

    await engineController.getByBoat(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "Engine information not found",
    });
  });

  it("returns 403 if client not owner", async () => {
    const req = { params: { bid: "5" }, user: { role: "Client", id: 1 } };
    const res = mockResponse();

    models.EngineInformation.findOne.mockResolvedValue({
      BID: 5,
      Boat: { UID: 999 },
    });

    await engineController.getByBoat(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
  });

  it("returns engine for staff", async () => {
    const req = { params: { bid: "5" }, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    const engine = { BID: 5 };
    models.EngineInformation.findOne.mockResolvedValue(engine);

    await engineController.getByBoat(req, res);

    expect(res.json).toHaveBeenCalledWith(engine);
  });

  it("returns 500 on error", async () => {
    const req = { params: { bid: "5" }, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    models.EngineInformation.findOne.mockRejectedValue(new Error("err"));

    await engineController.getByBoat(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Server error while fetching engine information",
      })
    );
  });
});

// ===========================================================================
// UPDATE
// ===========================================================================
describe("engineController.update", () => {
  it("returns 404 if not found", async () => {
    const req = { params: { bid: "5" }, body: {}, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    models.EngineInformation.findOne.mockResolvedValue(null);

    await engineController.update(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "Engine information not found",
    });
  });

  it("returns 403 if client not owner", async () => {
    const req = { params: { bid: "5" }, body: {}, user: { role: "Client", id: 1 } };
    const res = mockResponse();

    models.EngineInformation.findOne.mockResolvedValue({
      Boat: { UID: 999 },
    });

    await engineController.update(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
  });

  it("returns 400 if any required field set to empty string", async () => {
    const req = {
      params: { bid: "5" },
      body: { Model: "" },
      user: { role: "Admin", id: 1 },
    };
    const res = mockResponse();

    models.EngineInformation.findOne.mockResolvedValue({
      Boat: { UID: 1 },
    });

    await engineController.update(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Field Model cannot be empty",
    });
  });

  it("updates engine successfully", async () => {
    const req = {
      params: { bid: "5" },
      body: { Model: "NewM" },
      user: { role: "Admin", id: 1 },
    };
    const res = mockResponse();

    models.EngineInformation.findOne
      .mockResolvedValueOnce({ Boat: { UID: 1 } })
      .mockResolvedValueOnce({ BID: 5, Model: "NewM" });

    await engineController.update(req, res);

    expect(models.EngineInformation.update).toHaveBeenCalled();
    expect(t.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ BID: 5, Model: "NewM" });
  });

  it("returns 500 on error", async () => {
    const req = { params: { bid: "5" }, body: {}, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    models.EngineInformation.findOne.mockRejectedValue(new Error("err"));

    await engineController.update(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Server error while updating engine information",
      })
    );
  });
});

// ===========================================================================
// DELETE
// ===========================================================================
describe("engineController.remove", () => {
  it("returns 404 if not found", async () => {
    const req = { params: { bid: "5" }, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    models.EngineInformation.findOne.mockResolvedValue(null);

    await engineController.remove(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "Engine information not found",
    });
  });

  it("deletes engine info", async () => {
    const req = { params: { bid: "5" }, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    models.EngineInformation.findOne.mockResolvedValue({ BID: 5 });

    await engineController.remove(req, res);

    expect(models.EngineInformation.destroy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { BID: 5 },
      })
    );
    expect(t.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: "Engine information deleted" });
  });

  it("returns 500 on error", async () => {
    const req = { params: { bid: "5" }, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    models.EngineInformation.findOne.mockRejectedValue(new Error("err"));

    await engineController.remove(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Server error while deleting engine information",
      })
    );
  });
});
