const mockRes = require("./mockRes");
const problemsController = require("../Controllers/problemsController");

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
      Problems: {
        findAll: jest.fn(),
        findByPk: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      Boats: {
        findByPk: jest.fn(),
      },
      BoatStorage: {
        findByPk: jest.fn(),
      },
      User: {},
      Work: {
        create: jest.fn(),
      },
      Services: {
        findByPk: jest.fn(),
      },
      Seasons: {
        findOne: jest.fn(),
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
// LIST
// ==========================================================================
describe("problemsController.list", () => {
  it("400 invalid AID", async () => {
    const res = mockRes();
    await problemsController.list(
      { user: { role: "Admin" }, query: { AID: "x" } },
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("staff without AID", async () => {
    const res = mockRes();
    models.Problems.findAll.mockResolvedValue([{ PID: 1 }]);

    await problemsController.list(
      { user: { role: "Admin" }, query: {} },
      res
    );

    expect(res.json).toHaveBeenCalledWith([{ PID: 1 }]);
  });

  it("client without AID", async () => {
    const res = mockRes();
    models.Problems.findAll.mockResolvedValue([{ PID: 2 }]);

    await problemsController.list(
      { user: { role: "Client", id: 5 }, query: {} },
      res
    );

    expect(res.json).toHaveBeenCalledWith([{ PID: 2 }]);
  });

  it("client WITH AID filter", async () => {
    const res = mockRes();
    models.Problems.findAll.mockResolvedValue([{ PID: 3 }]);

    await problemsController.list(
      { user: { role: "Client", id: 5 }, query: { AID: "10" } },
      res
    );

    expect(models.Problems.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { AID: 10 } })
    );
    expect(res.json).toHaveBeenCalledWith([{ PID: 3 }]);
  });

  it("500 on error", async () => {
    const res = mockRes();
    models.Problems.findAll.mockRejectedValue(new Error());

    await problemsController.list(
      { user: { role: "Admin" }, query: {} },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ==========================================================================
// GET ONE
// ==========================================================================
describe("problemsController.getOne", () => {
  it("404 not found", async () => {
    const res = mockRes();
    models.Problems.findByPk.mockResolvedValue(null);

    await problemsController.getOne(
      { params: { id: "1" }, user: { role: "Admin" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("403 forbidden for client", async () => {
    const res = mockRes();
    models.Problems.findByPk.mockResolvedValue({
      Boat: { UID: 9 },
    });

    await problemsController.getOne(
      { params: { id: "1" }, user: { role: "Client", id: 5 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns record", async () => {
    const res = mockRes();
    models.Problems.findByPk.mockResolvedValue({
      PID: 1,
      Boat: { UID: 5 },
    });

    await problemsController.getOne(
      { params: { id: "1" }, user: { role: "Client", id: 5 } },
      res
    );

    expect(res.json).toHaveBeenCalled();
  });

  it("500 on error", async () => {
    const res = mockRes();
    models.Problems.findByPk.mockRejectedValue(new Error());

    await problemsController.getOne(
      { params: { id: "1" }, user: { role: "Admin" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ==========================================================================
// CREATE
// ==========================================================================
describe("problemsController.create", () => {
  it("400 missing AID or Description", async () => {
    const res = mockRes();

    await problemsController.create(
      { body: {}, query: {}, user: { role: "Client" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(t.rollback).toHaveBeenCalled();
  });

  it("400 invalid Type", async () => {
    const res = mockRes();
    models.BoatStorage.findByPk.mockResolvedValue({ BID: 1 });
    models.Boats.findByPk.mockResolvedValue({ UID: 1 });

    await problemsController.create(
      {
        body: { AID: 1, Description: "x", Type: "BAD" },
        query: {},
        user: { role: "Admin" },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("403 client forbidden", async () => {
    const res = mockRes();
    models.BoatStorage.findByPk.mockResolvedValue({ BID: 1 });
    models.Boats.findByPk.mockResolvedValue({ UID: 99 });

    await problemsController.create(
      {
        body: { AID: 1, Description: "x" },
        query: {},
        user: { role: "Client", id: 1 },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("creates problem without autoWork", async () => {
    const res = mockRes();
    models.BoatStorage.findByPk.mockResolvedValue({ BID: 1 });
    models.Boats.findByPk.mockResolvedValue({ UID: 1 });
    models.Problems.create.mockResolvedValue({ PID: 10 });

    await problemsController.create(
      {
        body: { AID: 1, Description: "Leak" },
        query: {},
        user: { role: "Admin" },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("400 autoWork without SID", async () => {
    const res = mockRes();
    models.BoatStorage.findByPk.mockResolvedValue({ BID: 1 });
    models.Boats.findByPk.mockResolvedValue({ UID: 1 });
    models.Problems.create.mockResolvedValue({ PID: 10 });

    await problemsController.create(
      {
        body: { AID: 1, Description: "Leak" },
        query: { autoWork: "true" },
        user: { role: "Admin" },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("500 with thrown error message", async () => {
    const res = mockRes();
    models.BoatStorage.findByPk.mockRejectedValue(new Error("boom"));

    await problemsController.create(
      {
        body: { AID: 1, Description: "Leak" },
        query: {},
        user: { role: "Admin" },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "boom" });
  });

  it("creates problem + work (autoWork)", async () => {
    const res = mockRes();
    models.BoatStorage.findByPk.mockResolvedValue({ BID: 1, seasonID: 5 });
    models.Boats.findByPk.mockResolvedValue({ UID: 1 });
    models.Services.findByPk.mockResolvedValue({ SID: 9 });
    models.Problems.create.mockResolvedValue({ PID: 10 });
    models.Work.create.mockResolvedValue({ WID: 20 });

    await problemsController.create(
      {
        body: { AID: 1, Description: "Leak", SID: 9 },
        query: { autoWork: "true" },
        user: { role: "Admin" },
      },
      res
    );

    expect(models.Work.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

// ==========================================================================
// ADD WORK
// ==========================================================================
describe("problemsController.addWork", () => {
  it("400 storage missing for AID", async () => {
    const res = mockRes();

    models.Problems.findByPk.mockResolvedValue({
      PID: 1,
      BID: 1,
      AID: 5,
      Type: "ClientRequest",
      ApprovedByClient: true,
      Boat: {},
    });

    models.Services.findByPk.mockResolvedValue({});
    models.BoatStorage.findByPk.mockResolvedValue(null);

    await problemsController.addWork(
      { params: { id: "1" }, body: { SID: 2 }, user: { role: "Admin" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("fallback season when no AID", async () => {
  const res = mockRes();

  models.Problems.findByPk.mockResolvedValue({
    PID: 1,
    BID: 1,
    AID: null,
    Type: "ClientRequest",
    ApprovedByClient: true,
    Description: "Test",
    Boat: {},
    save: jest.fn(),
  });

  models.Services.findByPk.mockResolvedValue({ SID: 2 });

  models.Seasons.findOne.mockResolvedValue({
    seasonID: 9,
    StartDate: new Date("2024-01-01"),
    EndDate: new Date("2025-12-31"),
  });

  models.Work.create.mockResolvedValue({ WID: 99 });

  await problemsController.addWork(
    {
      params: { id: "1" },
      body: { SID: 2 },
      user: { role: "Admin" },
    },
    res
  );

  expect(res.status).toHaveBeenCalledWith(201);
});


});

// ==========================================================================
// UPDATE STATUS
// ==========================================================================
describe("problemsController.updateStatus", () => {
  it("400 invalid status", async () => {
    const res = mockRes();

    await problemsController.updateStatus(
      { params: { id: "1" }, body: { Status: "BAD" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("404 not found", async () => {
    const res = mockRes();
    models.Problems.findByPk.mockResolvedValue(null);

    await problemsController.updateStatus(
      { params: { id: "1" }, body: { Status: "New" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("updates status", async () => {
    const res = mockRes();
    const rec = { save: jest.fn() };

    models.Problems.findByPk.mockResolvedValue(rec);

    await problemsController.updateStatus(
      { params: { id: "1" }, body: { Status: "Resolved" } },
      res
    );

    expect(rec.Status).toBe("Resolved");
    expect(res.json).toHaveBeenCalledWith(rec);
  });

  it("500 on error", async () => {
    const res = mockRes();
    models.Problems.findByPk.mockRejectedValue(new Error());

    await problemsController.updateStatus(
      { params: { id: "1" }, body: { Status: "Resolved" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ==========================================================================
// UPDATE
// ==========================================================================
describe("problemsController.update", () => {
  it("404 not found", async () => {
    const res = mockRes();
    models.Problems.findByPk.mockResolvedValue(null);

    await problemsController.update(
      { params: { id: "1" }, user: { role: "Admin" }, body: {} },
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("403 client forbidden", async () => {
    const res = mockRes();
    models.Problems.findByPk.mockResolvedValue({
      Boat: { UID: 9 },
    });

    await problemsController.update(
      { params: { id: "1" }, user: { role: "Client", id: 5 }, body: {} },
      res
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("400 invalid Status for staff", async () => {
    const res = mockRes();
    models.Problems.findByPk.mockResolvedValue({
      Boat: { UID: 5 },
    });

    await problemsController.update(
      {
        params: { id: "1" },
        user: { role: "Admin" },
        body: { Status: "BAD" },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("400 invalid Type for staff", async () => {
    const res = mockRes();
    models.Problems.findByPk.mockResolvedValue({
      Boat: { UID: 5 },
    });

    await problemsController.update(
      {
        params: { id: "1" },
        user: { role: "Admin" },
        body: { Type: "BAD" },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("client with empty body succeeds", async () => {
    const res = mockRes();

    models.Problems.findByPk.mockResolvedValue({
      PID: 1,
      Boat: { UID: 5 },
    });

    models.Problems.update.mockResolvedValue([1]);
    models.Problems.findByPk.mockResolvedValue({ PID: 1 });

    await problemsController.update(
      { params: { id: "1" }, user: { role: "Client", id: 5 }, body: {} },
      res
    );

    expect(res.json).toHaveBeenCalled();
  });

  it("admin updates everything", async () => {
    const res = mockRes();

    models.Problems.findByPk.mockResolvedValue({
      PID: 1,
      Boat: { UID: 5 },
    });

    models.Problems.update.mockResolvedValue([1]);
    models.Problems.findByPk.mockResolvedValue({ PID: 1 });

    await problemsController.update(
      {
        params: { id: "1" },
        user: { role: "Admin" },
        body: { Description: "Fix", Status: "InProgress", Type: "Issue" },
      },
      res
    );

    expect(res.json).toHaveBeenCalled();
  });

  it("500 on error", async () => {
    const res = mockRes();
    models.Problems.findByPk.mockRejectedValue(new Error());

    await problemsController.update(
      { params: { id: "1" }, user: { role: "Admin" }, body: {} },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ==========================================================================
// APPROVE
// ==========================================================================
describe("problemsController.approve", () => {
  it("404 not found", async () => {
    const res = mockRes();
    models.Problems.findByPk.mockResolvedValue(null);

    await problemsController.approve(
      { params: { id: "1" }, user: { id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("400 not Issue", async () => {
    const res = mockRes();
    models.Problems.findByPk.mockResolvedValue({
      Type: "ClientRequest",
      Boat: { UID: 1 },
    });

    await problemsController.approve(
      { params: { id: "1" }, user: { id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("403 not owner", async () => {
    const res = mockRes();
    models.Problems.findByPk.mockResolvedValue({
      Type: "Issue",
      Boat: { UID: 9 },
    });

    await problemsController.approve(
      { params: { id: "1" }, user: { id: 5 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("approves issue", async () => {
    const res = mockRes();
    const rec = {
      Type: "Issue",
      Boat: { UID: 5 },
      save: jest.fn(),
    };

    models.Problems.findByPk.mockResolvedValue(rec);

    await problemsController.approve(
      { params: { id: "1" }, user: { id: 5 } },
      res
    );

    expect(rec.ApprovedByClient).toBe(true);
    expect(res.json).toHaveBeenCalled();
  });

  it("500 on error", async () => {
    const res = mockRes();
    models.Problems.findByPk.mockRejectedValue(new Error());

    await problemsController.approve(
      { params: { id: "1" }, user: { id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
