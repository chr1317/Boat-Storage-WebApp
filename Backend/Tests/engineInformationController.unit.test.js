const engineController = require("../Controllers/engineInformationController");
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
describe("engineController.create", () => {
  it("400 when BID missing", async () => {
    const res = mockRes();

    await engineController.create(
      { body: {}, user: { role: "Admin", id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(t.rollback).toHaveBeenCalled();
  });

  it("404 when boat not found", async () => {
    const res = mockRes();
    models.Boats.findByPk.mockResolvedValue(null);

    await engineController.create(
      { body: { BID: 1 }, user: { role: "Admin", id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("403 when client not owner", async () => {
    const res = mockRes();
    models.Boats.findByPk.mockResolvedValue({ UID: 99 });

    await engineController.create(
      { body: { BID: 1 }, user: { role: "Client", id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("409 when engine already exists", async () => {
    const res = mockRes();
    models.Boats.findByPk.mockResolvedValue({ UID: 1 });
    models.EngineInformation.findOne.mockResolvedValue({ BID: 1 });

    await engineController.create(
      { body: { BID: 1, Model: "X" }, user: { role: "Admin", id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("400 when no engine fields provided", async () => {
    const res = mockRes();
    models.Boats.findByPk.mockResolvedValue({ UID: 1 });
    models.EngineInformation.findOne.mockResolvedValue(null);

    await engineController.create(
      { body: { BID: 1 }, user: { role: "Admin", id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "At least one engine field is required (besides BID)",
    });
  });

  it("201 creates engine (happy path)", async () => {
    const res = mockRes();
    models.Boats.findByPk.mockResolvedValue({ UID: 1 });
    models.EngineInformation.findOne.mockResolvedValue(null);
    models.EngineInformation.create.mockResolvedValue({ BID: 1 });

    await engineController.create(
      {
        body: { BID: 1, Model: "Volvo", Brand: "Penta" },
        user: { role: "Admin", id: 1 },
      },
      res
    );

    expect(models.EngineInformation.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(t.commit).toHaveBeenCalled();
  });

  it("500 on create error", async () => {
    const res = mockRes();
    models.Boats.findByPk.mockRejectedValue(new Error("db"));

    await engineController.create(
      { body: { BID: 1, Model: "X" }, user: { role: "Admin", id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ==========================================================================
// GET BY BOAT
// ==========================================================================
describe("engineController.getByBoat", () => {
  it("404 when not found", async () => {
    const res = mockRes();
    models.EngineInformation.findOne.mockResolvedValue(null);

    await engineController.getByBoat(
      { params: { bid: "1" }, user: { role: "Admin", id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("403 when client not owner", async () => {
    const res = mockRes();
    models.EngineInformation.findOne.mockResolvedValue({
      Boat: { UID: 9 },
    });

    await engineController.getByBoat(
      { params: { bid: "1" }, user: { role: "Client", id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns engine for owner", async () => {
    const res = mockRes();
    models.EngineInformation.findOne.mockResolvedValue({
      BID: 1,
      Boat: { UID: 1 },
    });

    await engineController.getByBoat(
      { params: { bid: "1" }, user: { role: "Client", id: 1 } },
      res
    );

    expect(res.json).toHaveBeenCalled();
  });

  it("500 on get error", async () => {
    const res = mockRes();
    models.EngineInformation.findOne.mockRejectedValue(new Error());

    await engineController.getByBoat(
      { params: { bid: "1" }, user: { role: "Admin", id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ==========================================================================
// UPDATE
// ==========================================================================
describe("engineController.update", () => {
  it("404 when engine not found", async () => {
    const res = mockRes();
    models.EngineInformation.findOne.mockResolvedValue(null);

    await engineController.update(
      { params: { bid: "1" }, body: {}, user: { role: "Admin", id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("403 when client not owner", async () => {
    const res = mockRes();
    models.EngineInformation.findOne.mockResolvedValue({
      Boat: { UID: 9 },
    });

    await engineController.update(
      { params: { bid: "1" }, body: { Model: "X" }, user: { role: "Client", id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("400 when no fields provided", async () => {
    const res = mockRes();
    models.EngineInformation.findOne.mockResolvedValue({
      BID: 1,
      Boat: { UID: 1 },
    });

    await engineController.update(
      { params: { bid: "1" }, body: {}, user: { role: "Admin", id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("updates engine", async () => {
    const res = mockRes();
    models.EngineInformation.findOne.mockResolvedValue({
      BID: 1,
      Boat: { UID: 1 },
    });

    models.EngineInformation.update.mockResolvedValue([1]);
    models.EngineInformation.findOne.mockResolvedValue({
      BID: 1,
      Model: "New",
    });

    await engineController.update(
      {
        params: { bid: "1" },
        body: { Model: "New" },
        user: { role: "Admin", id: 1 },
      },
      res
    );

    expect(res.json).toHaveBeenCalled();
    expect(t.commit).toHaveBeenCalled();
  });

  it("500 on update error", async () => {
    const res = mockRes();
    models.EngineInformation.findOne.mockRejectedValue(new Error());

    await engineController.update(
      { params: { bid: "1" }, body: { Model: "X" }, user: { role: "Admin", id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ==========================================================================
// REMOVE
// ==========================================================================
describe("engineController.remove", () => {
  it("404 when engine not found", async () => {
    const res = mockRes();
    models.EngineInformation.findOne.mockResolvedValue(null);

    await engineController.remove(
      { params: { bid: "1" }, user: { role: "Admin", id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("deletes engine", async () => {
    const res = mockRes();
    models.EngineInformation.findOne.mockResolvedValue({ BID: 1 });
    models.EngineInformation.destroy.mockResolvedValue(1);

    await engineController.remove(
      { params: { bid: "1" }, user: { role: "Admin", id: 1 } },
      res
    );

    expect(res.json).toHaveBeenCalledWith({
      message: "Engine information deleted",
    });
    expect(t.commit).toHaveBeenCalled();
  });

  it("500 on delete error", async () => {
    const res = mockRes();
    models.EngineInformation.findOne.mockRejectedValue(new Error());

    await engineController.remove(
      { params: { bid: "1" }, user: { role: "Admin", id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
