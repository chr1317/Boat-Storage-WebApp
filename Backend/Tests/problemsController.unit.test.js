const mockResponse = require("./mockRes");
const problemsController = require("../Controllers/problemsController");

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
      Problems: {
        findAll: jest.fn(),
        findByPk: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      Boats: {
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
      }
    },
    __mockTransaction: mockTransaction,
  };
});

const { models, __mockTransaction: t } = require("../Database/db");

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

//
// ───────────────────────────────────────────────────────────────
//   LIST
// ───────────────────────────────────────────────────────────────
//
describe("problemsController.list", () => {
  it("staff sees all problems", async () => {
    const req = { user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    const list = [{ PID: 1 }, { PID: 2 }];
    models.Problems.findAll.mockResolvedValue(list);

    await problemsController.list(req, res);

    expect(models.Problems.findAll).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(list);
  });

  it("client sees only his problems", async () => {
    const req = { user: { role: "Client", id: 7 } };
    const res = mockResponse();

    const list = [{ PID: 1 }];
    models.Problems.findAll.mockResolvedValue(list);

    await problemsController.list(req, res);

    expect(models.Problems.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.any(Array),
      })
    );
    expect(res.json).toHaveBeenCalledWith(list);
  });

  it("returns 500 on error", async () => {
    const req = { user: { role: "Admin" } };
    const res = mockResponse();

    models.Problems.findAll.mockRejectedValue(new Error("err"));

    await problemsController.list(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

//
// ───────────────────────────────────────────────────────────────
//   GET ONE
// ───────────────────────────────────────────────────────────────
//
describe("problemsController.getOne", () => {
  it("returns 404 if problem not found", async () => {
    const req = { params: { id: "1" }, user: { role: "Admin" } };
    const res = mockResponse();

    models.Problems.findByPk.mockResolvedValue(null);

    await problemsController.getOne(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 403 for client not owner", async () => {
    const req = { params: { id: "1" }, user: { role: "Client", id: 5 } };
    const res = mockResponse();

    models.Problems.findByPk.mockResolvedValue({
      PID: 1,
      Boat: { UID: 999 },
    });

    await problemsController.getOne(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns problem for staff", async () => {
    const req = { params: { id: "1" }, user: { role: "Admin" } };
    const res = mockResponse();

    const rec = { PID: 1 };
    models.Problems.findByPk.mockResolvedValue(rec);

    await problemsController.getOne(req, res);

    expect(res.json).toHaveBeenCalledWith(rec);
  });

  it("500 on error", async () => {
    const req = { params: { id: "1" }, user: { role: "Admin" } };
    const res = mockResponse();

    models.Problems.findByPk.mockRejectedValue(new Error("err"));

    await problemsController.getOne(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

//
// ───────────────────────────────────────────────────────────────
//   CREATE
// ───────────────────────────────────────────────────────────────
//
describe("problemsController.create", () => {
  it("400 if missing BID or Description", async () => {
    const req = { body: {}, query: {}, user: { role: "Client", id: 1 } };
    const res = mockResponse();

    await problemsController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("invalid Type", async () => {
    const req = {
      body: { BID: 1, Description: "x", Type: "Bad" },
      query: {},
      user: { role: "Admin", id: 1 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue({ BID: 1, UID: 1 });

    await problemsController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid Type" });
  });

  it("404 if boat not found", async () => {
    const req = {
      body: { BID: 1, Description: "x" },
      query: {},
      user: { role: "Admin", id: 1 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue(null);

    await problemsController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("403 if client not owner", async () => {
    const req = {
      body: { BID: 1, Description: "x" },
      query: {},
      user: { role: "Client", id: 1 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue({ BID: 1, UID: 999 });

    await problemsController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("creates simple problem (no autoWork)", async () => {
    const req = {
      body: { BID: 1, Description: "Leak" },
      query: {}, // autoWork=false
      user: { role: "Admin", id: 1 },
    };
    const res = mockResponse();

    const created = { PID: 1 };
    models.Boats.findByPk.mockResolvedValue({ BID: 1, UID: 1 });
    models.Problems.create.mockResolvedValue(created);

    await problemsController.create(req, res);

    expect(models.Problems.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("400 if autoWork=true but no SID", async () => {
    const req = {
      body: { BID: 1, Description: "Leak" },
      query: { autoWork: "true" },
      user: { role: "Admin", id: 1 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue({ BID: 1, UID: 1 });

    await problemsController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "SID is required when autoWork=true" });
  });

  it("404 if service not found (autoWork)", async () => {
    const req = {
      body: { BID: 1, Description: "Leak", SID: 9 },
      query: { autoWork: "true" },
      user: { role: "Admin", id: 1 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue({ BID: 1, UID: 1 });
    models.Services.findByPk.mockResolvedValue(null);

    await problemsController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("400 when no active season", async () => {
    const req = {
      body: { BID: 1, Description: "Leak", SID: 9 },
      query: { autoWork: "true" },
      user: { role: "Admin", id: 1 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue({ BID: 1, UID: 1 });
    models.Services.findByPk.mockResolvedValue({});
    models.Seasons.findOne.mockResolvedValue(null);

    await problemsController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("creates problem + work when autoWork=true", async () => {
    const req = {
      body: { BID: 1, Description: "Leak", SID: 9 },
      query: { autoWork: "true" },
      user: { role: "Admin", id: 1 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue({ BID: 1, UID: 1 });
    models.Services.findByPk.mockResolvedValue({ SID: 9 });
    models.Seasons.findOne.mockResolvedValue({ seasonID: 5 });

    models.Work.create.mockResolvedValue({ WID: 15 });
    models.Problems.create.mockResolvedValue({ PID: 22 });

    await problemsController.create(req, res);

    expect(models.Work.create).toHaveBeenCalled();
    expect(models.Problems.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("500 on error", async () => {
    const req = {
      body: { BID: 1, Description: "Leak" },
      query: {},
      user: { role: "Admin", id: 1 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockRejectedValue(new Error("err"));

    await problemsController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

//
// ───────────────────────────────────────────────────────────────
//   ADD WORK
// ───────────────────────────────────────────────────────────────
//
describe("problemsController.addWork", () => {
  it("404 if problem not found", async () => {
    const req = { params: { id: "1" }, body: { SID: 9 }, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    models.Problems.findByPk.mockResolvedValue(null);

    await problemsController.addWork(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("400 if no SID", async () => {
    const req = {
      params: { id: "1" },
      body: {},
      user: { role: "Admin" }
    };
    const res = mockResponse();

    models.Problems.findByPk.mockResolvedValue({
      PID: 1,
      BID: 1,
      Description: "Leak",
    });

    await problemsController.addWork(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("404 if service not found", async () => {
    const req = {
      params: { id: "1" },
      body: { SID: 9 },
      user: { role: "Admin" },
    };
    const res = mockResponse();

    models.Problems.findByPk.mockResolvedValue({
      PID: 1,
      BID: 1,
      Description: "Leak",
    });
    models.Services.findByPk.mockResolvedValue(null);

    await problemsController.addWork(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("400 if no active season", async () => {
    const req = {
      params: { id: "1" },
      body: { SID: 9 },
      user: { role: "Admin" },
    };
    const res = mockResponse();

    models.Problems.findByPk.mockResolvedValue({ PID: 1, BID: 1, Description: "x" });
    models.Services.findByPk.mockResolvedValue({});
    models.Seasons.findOne.mockResolvedValue(null);

    await problemsController.addWork(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("creates work and links to problem", async () => {
    const req = {
      params: { id: "1" },
      body: { SID: 9 },
      user: { role: "Admin" },
    };
    const res = mockResponse();

    const prob = {
      PID: 1,
      BID: 1,
      Description: "Leak",
      save: jest.fn().mockResolvedValue()
    };

    models.Problems.findByPk.mockResolvedValue(prob);
    models.Services.findByPk.mockResolvedValue({});
    models.Seasons.findOne.mockResolvedValue({ seasonID: 3 });
    models.Work.create.mockResolvedValue({ WID: 44 });

    await problemsController.addWork(req, res);

    expect(prob.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("500 on error", async () => {
    const req = {
      params: { id: "1" },
      body: { SID: 9 },
      user: { role: "Admin" },
    };
    const res = mockResponse();

    models.Problems.findByPk.mockRejectedValue(new Error("err"));

    await problemsController.addWork(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

//
// ───────────────────────────────────────────────────────────────
//   UPDATE STATUS
// ───────────────────────────────────────────────────────────────
//
describe("problemsController.updateStatus", () => {
  it("400 invalid status", async () => {
    const req = { params: { id: "1" }, body: { Status: "Bad" }, user: {} };
    const res = mockResponse();

    await problemsController.updateStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("404 when problem not found", async () => {
    const req = { params: { id: "1" }, body: { Status: "New" }, user: {} };
    const res = mockResponse();

    models.Problems.findByPk.mockResolvedValue(null);

    await problemsController.updateStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("updates status", async () => {
    const req = { params: { id: "1" }, body: { Status: "Resolved" }, user: {} };
    const res = mockResponse();

    const rec = { PID: 1, save: jest.fn().mockResolvedValue() };

    models.Problems.findByPk.mockResolvedValue(rec);

    await problemsController.updateStatus(req, res);

    expect(rec.Status).toBe("Resolved");
    expect(res.json).toHaveBeenCalledWith(rec);
  });
});

//
// ───────────────────────────────────────────────────────────────
//   UPDATE
// ───────────────────────────────────────────────────────────────
//
describe("problemsController.update", () => {
  it("404 if problem not found", async () => {
    const req = { params: { id: "1" }, body: {}, user: { role: "Client", id: 1 } };
    const res = mockResponse();

    models.Problems.findByPk.mockResolvedValue(null);

    await problemsController.update(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("403 if client is not owner", async () => {
    const req = { params: { id: "1" }, user: { role: "Client", id: 7 }, body: {} };
    const res = mockResponse();

    models.Problems.findByPk.mockResolvedValue({
      PID: 1,
      Boat: { UID: 999 }
    });

    await problemsController.update(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("400 invalid Type for staff", async () => {
    const req = { params: { id: "1" }, user: { role: "Admin" }, body: { Type: "Bad" } };
    const res = mockResponse();

    models.Problems.findByPk.mockResolvedValue({
      PID: 1,
      Boat: { UID: 5 }
    });

    await problemsController.update(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("updates as admin", async () => {
    const req = {
      params: { id: "1" },
      user: { role: "Admin" },
      body: { Description: "Fix", Type: "Issue" }
    };
    const res = mockResponse();

    models.Problems.findByPk.mockResolvedValue({
      PID: 1,
      Boat: { UID: 5 }
    });

    models.Problems.update.mockResolvedValue([1]);
    models.Problems.findByPk.mockResolvedValue({ PID: 1, Description: "Fix" });

    await problemsController.update(req, res);

    expect(res.json).toHaveBeenCalledWith({ PID: 1, Description: "Fix" });
  });

  it("client updates only description", async () => {
    const req = {
      params: { id: "1" },
      user: { role: "Client", id: 3 },
      body: { Description: "New text" }
    };
    const res = mockResponse();

    models.Problems.findByPk.mockResolvedValue({
      PID: 1,
      Boat: { UID: 3 }
    });

    models.Problems.findByPk.mockResolvedValueOnce({
      PID: 1,
      Boat: { UID: 3 }
    });

    models.Problems.update.mockResolvedValue([1]);
    models.Problems.findByPk.mockResolvedValue({ PID: 1, Description: "New text" });

    await problemsController.update(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ Description: "New text" })
    );
  });
});
