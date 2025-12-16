const mockRes = require("./mockRes");
const workController = require("../Controllers/workController");

jest.mock("../Controllers/updateProblemStatus", () => ({
  updateProblemStatusIfNeeded: jest.fn(),
}));
const { updateProblemStatusIfNeeded } = require("../Controllers/updateProblemStatus");

// ==========================================================================
// MOCK DB & TRANSACTIONS
// ==========================================================================
jest.mock("../Database/db", () => {
  const tx = {
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
  };

  return {
    sequelize: {
      transaction: jest.fn().mockResolvedValue(tx),
      query: jest.fn(),
    },
    models: {
      Boats: { findByPk: jest.fn() },
      Services: { findByPk: jest.fn() },
      Seasons: { findByPk: jest.fn() },
      BoatStorage: { findByPk: jest.fn() },

      Work: {
        findAll: jest.fn(),
        findByPk: jest.fn(),
        create: jest.fn(),
        destroy: jest.fn(),
      },

      User: {},
    },
    __tx: tx,
  };
});

const { models, sequelize, __tx: t } = require("../Database/db");

// ==========================================================================
// HELPERS
// ==========================================================================
function fixedDateNow(dateStr = "2025-01-01T10:00:00Z") {
  const d = new Date(dateStr);
  jest.useFakeTimers();
  jest.setSystemTime(d);
  return d;
}

// ==========================================================================
// BEFORE EACH
// ==========================================================================
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
});

// ==========================================================================
// CREATE
// ==========================================================================
describe("workController.create", () => {
  it("400 when AID missing (rollback + message)", async () => {
    const req = { body: { SID: 1 } };
    const res = mockRes();

    await workController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("AID is required") })
    );
  });

  it("400 when BoatStorage not found", async () => {
    const req = { body: { AID: 1, SID: 2 } };
    const res = mockRes();

    models.BoatStorage.findByPk.mockResolvedValue(null);

    await workController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "BoatStorage (AID) not found" });
  });

  it("500 when boat not found", async () => {
    const req = { body: { AID: 1, SID: 2 } };
    const res = mockRes();

    models.BoatStorage.findByPk.mockResolvedValue({ BID: 10, seasonID: 20 });
    models.Boats.findByPk.mockResolvedValue(null);
    models.Services.findByPk.mockResolvedValue({});
    models.Seasons.findByPk.mockResolvedValue({});

    await workController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Boat not found" });
  });

  it("500 when service not found", async () => {
    const req = { body: { AID: 1, SID: 2 } };
    const res = mockRes();

    models.BoatStorage.findByPk.mockResolvedValue({ BID: 10, seasonID: 20 });
    models.Boats.findByPk.mockResolvedValue({});
    models.Services.findByPk.mockResolvedValue(null);
    models.Seasons.findByPk.mockResolvedValue({});

    await workController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Service not found" });
  });

  it("500 when season not found", async () => {
    const req = { body: { AID: 1, SID: 2 } };
    const res = mockRes();

    models.BoatStorage.findByPk.mockResolvedValue({ BID: 10, seasonID: 20 });
    models.Boats.findByPk.mockResolvedValue({});
    models.Services.findByPk.mockResolvedValue({});
    models.Seasons.findByPk.mockResolvedValue(null);

    await workController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Season not found" });
  });

  it("500 invalid work state", async () => {
    const req = { body: { AID: 1, SID: 2, State: "XXX" } };
    const res = mockRes();

    models.BoatStorage.findByPk.mockResolvedValue({ BID: 10, seasonID: 20 });
    models.Boats.findByPk.mockResolvedValue({});
    models.Services.findByPk.mockResolvedValue({});
    models.Seasons.findByPk.mockResolvedValue({});

    await workController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid work state" });
  });

  it("500 parent work not found", async () => {
    const req = { body: { AID: 1, SID: 2, parentWID: 99 } };
    const res = mockRes();

    models.BoatStorage.findByPk.mockResolvedValue({ BID: 10, seasonID: 20 });
    models.Boats.findByPk.mockResolvedValue({});
    models.Services.findByPk.mockResolvedValue({});
    models.Seasons.findByPk.mockResolvedValue({});
    models.Work.findByPk.mockResolvedValue(null);

    await workController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Parent work not found" });
  });

  it("500 only one level of subtasks allowed", async () => {
    const req = { body: { AID: 1, SID: 2, parentWID: 99 } };
    const res = mockRes();

    models.BoatStorage.findByPk.mockResolvedValue({ BID: 10, seasonID: 20 });
    models.Boats.findByPk.mockResolvedValue({});
    models.Services.findByPk.mockResolvedValue({});
    models.Seasons.findByPk.mockResolvedValue({});
    models.Work.findByPk.mockResolvedValue({ WID: 99, parentWID: 1 }); // parent already subtask

    await workController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Only one level of subtasks allowed" });
  });

  it("creates valid subtask and nulls HR/UID", async () => {
    const req = { body: { AID: 1, SID: 2, parentWID: 5, HR: 7, UID: 9 } };
    const res = mockRes();

    models.BoatStorage.findByPk.mockResolvedValue({ BID: 10, seasonID: 20 });
    models.Boats.findByPk.mockResolvedValue({});
    models.Services.findByPk.mockResolvedValue({});
    models.Seasons.findByPk.mockResolvedValue({});
    models.Work.findByPk.mockResolvedValue({ WID: 5, parentWID: null });
    models.Work.create.mockResolvedValue({ WID: 100 });

    await workController.create(req, res);

    expect(models.Work.create).toHaveBeenCalledWith(
      expect.objectContaining({ HR: null, UID: null, BID: 10, seasonID: 20 }),
      expect.any(Object)
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(t.commit).toHaveBeenCalled();
  });

  it("creates main work (happy path)", async () => {
    const req = { body: { AID: 1, SID: 2, State: "ToDo" } };
    const res = mockRes();

    models.BoatStorage.findByPk.mockResolvedValue({ BID: 10, seasonID: 20 });
    models.Boats.findByPk.mockResolvedValue({});
    models.Services.findByPk.mockResolvedValue({});
    models.Seasons.findByPk.mockResolvedValue({});
    models.Work.create.mockResolvedValue({ WID: 1 });

    await workController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(t.commit).toHaveBeenCalled();
  });
});

// ==========================================================================
// LIST ALL
// ==========================================================================
describe("workController.listAll", () => {
  it("returns works", async () => {
    const res = mockRes();
    models.Work.findAll.mockResolvedValue([{ WID: 1 }]);

    await workController.listAll({}, res);

    expect(res.json).toHaveBeenCalledWith([{ WID: 1 }]);
  });

  it("500 on error", async () => {
    const res = mockRes();
    models.Work.findAll.mockRejectedValue(new Error("fail"));

    await workController.listAll({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Server error listing works" });
  });
});

// ==========================================================================
// LIST BY STORAGE
// ==========================================================================
describe("workController.listByStorage", () => {
  it("400 invalid AID", async () => {
    const req = { params: { aid: "x" }, user: { role: "Admin", id: 1 } };
    const res = mockRes();

    await workController.listByStorage(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid AID" });
  });

  it("404 BoatStorage not found", async () => {
    const req = { params: { aid: "1" }, user: { role: "Admin", id: 1 } };
    const res = mockRes();

    models.BoatStorage.findByPk.mockResolvedValue(null);

    await workController.listByStorage(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "BoatStorage not found" });
  });

  it("403 client forbidden", async () => {
    const req = { params: { aid: "1" }, user: { role: "Client", id: 7 } };
    const res = mockRes();

    models.BoatStorage.findByPk.mockResolvedValue({ Boat: { UID: 999 } });

    await workController.listByStorage(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
  });

  it("returns works for staff (happy)", async () => {
    const req = { params: { aid: "1" }, user: { role: "Employee", id: 7 } };
    const res = mockRes();

    models.BoatStorage.findByPk.mockResolvedValue({ Boat: { UID: 999 } });
    models.Work.findAll.mockResolvedValue([{ WID: 1 }]);

    await workController.listByStorage(req, res);

    expect(res.json).toHaveBeenCalledWith([{ WID: 1 }]);
  });

  it("500 on error", async () => {
    const req = { params: { aid: "1" }, user: { role: "Admin", id: 1 } };
    const res = mockRes();

    models.BoatStorage.findByPk.mockRejectedValue(new Error("db"));

    await workController.listByStorage(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Error listing works by storage" });
  });
});

// ==========================================================================
// HISTORY BY BOAT
// ==========================================================================
describe("workController.historyByBoat", () => {
  it("400 invalid BID", async () => {
    const req = { params: { bid: "x" } };
    const res = mockRes();

    await workController.historyByBoat(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid BID" });
  });

  it("returns rows", async () => {
    const req = { params: { bid: "1" } };
    const res = mockRes();

    sequelize.query.mockResolvedValue([[{ WID: 1 }]]);

    await workController.historyByBoat(req, res);

    expect(res.json).toHaveBeenCalledWith([{ WID: 1 }]);
  });

  it("500 on query error", async () => {
    const req = { params: { bid: "1" } };
    const res = mockRes();

    sequelize.query.mockRejectedValue(new Error("sql"));

    await workController.historyByBoat(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Server error while fetching work history" });
  });
});

// ==========================================================================
// LIST BY BOAT
// ==========================================================================
describe("workController.listByBoat", () => {
  it("400 invalid boat id", async () => {
    const req = { params: { bid: "x" }, user: { role: "Admin", id: 1 }, query: {} };
    const res = mockRes();

    await workController.listByBoat(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid boat id" });
  });

  it("404 boat not found", async () => {
    const req = { params: { bid: "1" }, user: { role: "Admin", id: 1 }, query: {} };
    const res = mockRes();

    models.Boats.findByPk.mockResolvedValue(null);

    await workController.listByBoat(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Boat not found" });
  });

  it("403 access denied for client", async () => {
    const req = { params: { bid: "1" }, user: { role: "Client", id: 10 }, query: {} };
    const res = mockRes();

    models.Boats.findByPk.mockResolvedValue({ UID: 999 });

    await workController.listByBoat(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Access denied" });
  });

  it("400 invalid query AID", async () => {
    const req = { params: { bid: "1" }, user: { role: "Admin", id: 1 }, query: { AID: "x" } };
    const res = mockRes();

    models.Boats.findByPk.mockResolvedValue({ UID: 2 });

    await workController.listByBoat(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid AID" });
  });

  it("returns works (with query AID filter)", async () => {
    const req = { params: { bid: "1" }, user: { role: "Admin", id: 1 }, query: { AID: "5" } };
    const res = mockRes();

    models.Boats.findByPk.mockResolvedValue({ UID: 2 });
    models.Work.findAll.mockResolvedValue([{ WID: 1 }]);

    await workController.listByBoat(req, res);

    expect(models.Work.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ BID: 1, parentWID: null, AID: 5 }),
      })
    );
    expect(res.json).toHaveBeenCalledWith([{ WID: 1 }]);
  });

  it("returns works (no query AID)", async () => {
    const req = { params: { bid: "1" }, user: { role: "Admin", id: 1 }, query: {} };
    const res = mockRes();

    models.Boats.findByPk.mockResolvedValue({ UID: 2 });
    models.Work.findAll.mockResolvedValue([{ WID: 2 }]);

    await workController.listByBoat(req, res);

    expect(res.json).toHaveBeenCalledWith([{ WID: 2 }]);
  });

  it("500 on error", async () => {
    const req = { params: { bid: "1" }, user: { role: "Admin", id: 1 }, query: {} };
    const res = mockRes();

    models.Boats.findByPk.mockRejectedValue(new Error("db"));

    await workController.listByBoat(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Server error listing works for boat" });
  });
});

// ==========================================================================
// EMPLOYEE WORKS
// ==========================================================================
describe("workController.employeeWorks", () => {
  it("400 missing user id in token", async () => {
    const req = { user: {} };
    const res = mockRes();

    await workController.employeeWorks(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Missing user id in token" });
  });

  it("returns works", async () => {
    const req = { user: { id: 10 } };
    const res = mockRes();

    models.Work.findAll.mockResolvedValue([{ WID: 1 }]);

    await workController.employeeWorks(req, res);

    expect(res.json).toHaveBeenCalledWith([{ WID: 1 }]);
  });

  it("500 on error returns e.message", async () => {
    const req = { user: { id: 10 } };
    const res = mockRes();

    models.Work.findAll.mockRejectedValue(new Error("boom"));

    await workController.employeeWorks(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "boom" });
  });
});

// ==========================================================================
// UPDATE STATE (pokrywa recalcParentState wszystkie gałęzie)
// ==========================================================================
describe("workController.updateState", () => {
  it("500 invalid state", async () => {
    const req = { params: { id: "1" }, body: { State: "XXX" } };
    const res = mockRes();

    await workController.updateState(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid state" });
  });

  it("500 work not found", async () => {
    const req = { params: { id: "1" }, body: { State: "ToDo" } };
    const res = mockRes();

    models.Work.findByPk.mockResolvedValue(null);

    await workController.updateState(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Work not found" });
  });

  it("400 blocks parent when subtasks exist", async () => {
    const req = { params: { id: "1" }, body: { State: "Done" } };
    const res = mockRes();

    models.Work.findByPk.mockResolvedValue({ WID: 1, parentWID: null, save: jest.fn() });
    models.Work.findAll.mockResolvedValue([{ WID: 2 }]);

    await workController.updateState(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Parent work state is controlled by subtasks.",
    });
  });

  it("updates main work (no parent) and calls updateProblemStatusIfNeeded", async () => {
    fixedDateNow("2025-01-01T10:00:00Z");
    const req = { params: { id: "1" }, body: { State: "InProgress" } };
    const res = mockRes();

    const rec = { WID: 1, parentWID: null, save: jest.fn().mockResolvedValue() };
    models.Work.findByPk.mockResolvedValue(rec);
    models.Work.findAll.mockResolvedValue([]); // no subtasks

    await workController.updateState(req, res);

    expect(rec.State).toBe("InProgress");
    expect(rec.Date).toBeInstanceOf(Date);
    expect(updateProblemStatusIfNeeded).toHaveBeenCalledWith(rec, t);
    expect(t.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(rec);
  });

  it("subtask -> recalcParentState: anyInProgress => parent InProgress", async () => {
    fixedDateNow("2025-01-01T10:00:00Z");
    const req = { params: { id: "2" }, body: { State: "Done" } };
    const res = mockRes();

    const sub = { WID: 2, parentWID: 100, save: jest.fn().mockResolvedValue() };
    const parent = { WID: 100, parentWID: null, save: jest.fn().mockResolvedValue() };

    models.Work.findByPk.mockImplementation((id) => {
      if (id === 2) return Promise.resolve(sub);
      if (id === 100) return Promise.resolve(parent);
      return Promise.resolve(null);
    });

    // 1) pobranie subtasks dla rec.WID (czy parent ma swoje subtasks) -> tu pusto, żeby nie zablokowało
    // 2) recalcParentState -> subtasks parentWID=100 -> tu dajemy anyInProgress
    models.Work.findAll.mockImplementation(({ where }) => {
      if (where.parentWID === 2) return Promise.resolve([]); // dla rec.WID
      if (where.parentWID === 100) return Promise.resolve([{ State: "InProgress" }, { State: "ToDo" }]);
      return Promise.resolve([]);
    });

    await workController.updateState(req, res);

    expect(parent.State).toBe("InProgress");
    expect(parent.save).toHaveBeenCalled();
    expect(updateProblemStatusIfNeeded).toHaveBeenCalledWith(parent, t);
    expect(updateProblemStatusIfNeeded).toHaveBeenCalledWith(sub, t);
  });

  it("subtask -> recalcParentState: allTodo => parent ToDo", async () => {
    const req = { params: { id: "2" }, body: { State: "ToDo" } };
    const res = mockRes();

    const sub = { WID: 2, parentWID: 200, save: jest.fn().mockResolvedValue() };
    const parent = { WID: 200, parentWID: null, save: jest.fn().mockResolvedValue() };

    models.Work.findByPk.mockImplementation((id) => {
      if (id === 2) return Promise.resolve(sub);
      if (id === 200) return Promise.resolve(parent);
      return Promise.resolve(null);
    });

    models.Work.findAll.mockImplementation(({ where }) => {
      if (where.parentWID === 2) return Promise.resolve([]);
      if (where.parentWID === 200) return Promise.resolve([{ State: "ToDo" }, { State: "ToDo" }]);
      return Promise.resolve([]);
    });

    await workController.updateState(req, res);

    expect(parent.State).toBe("ToDo");
  });

  it("subtask -> recalcParentState: allDone => parent Done and latest Date", async () => {
    const req = { params: { id: "2" }, body: { State: "Done" } };
    const res = mockRes();

    const sub = { WID: 2, parentWID: 300, save: jest.fn().mockResolvedValue() };
    const parent = { WID: 300, parentWID: null, save: jest.fn().mockResolvedValue() };

    models.Work.findByPk.mockImplementation((id) => {
      if (id === 2) return Promise.resolve(sub);
      if (id === 300) return Promise.resolve(parent);
      return Promise.resolve(null);
    });

    models.Work.findAll.mockImplementation(({ where }) => {
      if (where.parentWID === 2) return Promise.resolve([]);
      if (where.parentWID === 300)
        return Promise.resolve([
          { State: "Done", Date: "2025-01-01T08:00:00Z" },
          { State: "Done", Date: "2025-01-02T08:00:00Z" },
        ]);
      return Promise.resolve([]);
    });

    await workController.updateState(req, res);

    expect(parent.State).toBe("Done");
    expect(parent.Date).toBeInstanceOf(Date);
    expect(parent.Date.getTime()).toBe(new Date("2025-01-02T08:00:00Z").getTime());
  });

  it("subtask -> recalcParentState: mixed states no InProgress => else => InProgress", async () => {
    const req = { params: { id: "2" }, body: { State: "Done" } };
    const res = mockRes();

    const sub = { WID: 2, parentWID: 400, save: jest.fn().mockResolvedValue() };
    const parent = { WID: 400, parentWID: null, save: jest.fn().mockResolvedValue() };

    models.Work.findByPk.mockImplementation((id) => {
      if (id === 2) return Promise.resolve(sub);
      if (id === 400) return Promise.resolve(parent);
      return Promise.resolve(null);
    });

    models.Work.findAll.mockImplementation(({ where }) => {
      if (where.parentWID === 2) return Promise.resolve([]);
      if (where.parentWID === 400)
        return Promise.resolve([
          { State: "Done" },
          { State: "ToDo" },
        ]);
      return Promise.resolve([]);
    });

    await workController.updateState(req, res);

    expect(parent.State).toBe("InProgress");
  });

  it("500 on unexpected error", async () => {
    const req = { params: { id: "1" }, body: { State: "Done" } };
    const res = mockRes();

    models.Work.findByPk.mockRejectedValue(new Error("db"));

    await workController.updateState(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "db" });
  });
});

// ==========================================================================
// UPDATE
// ==========================================================================
describe("workController.update", () => {
  it("500 work not found", async () => {
    const req = { params: { id: "1" }, body: {} };
    const res = mockRes();

    models.Work.findByPk.mockResolvedValue(null);

    await workController.update(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Work not found" });
  });

  it("500 invalid state", async () => {
    const req = { params: { id: "1" }, body: { State: "XXX" } };
    const res = mockRes();

    models.Work.findByPk.mockResolvedValue({ parentWID: null });

    await workController.update(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid state" });
  });

  it("updates subtask: removes HR/UID from updates; no updates.State path", async () => {
    const req = { params: { id: "2" }, body: { HR: 5, UID: 7, Comment: "x" } };
    const res = mockRes();

    const rec = {
      parentWID: 100,
      update: jest.fn().mockResolvedValue(),
      save: jest.fn().mockResolvedValue(),
    };

    models.Work.findByPk.mockResolvedValue(rec);

    await workController.update(req, res);

    expect(rec.update).toHaveBeenCalledWith(
      expect.not.objectContaining({ HR: 5, UID: 7 }),
      expect.any(Object)
    );
    expect(updateProblemStatusIfNeeded).not.toHaveBeenCalled(); // bo brak updates.State
    expect(t.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(rec);
  });

  it("updates normal work without State (no updateProblemStatus)", async () => {
    const req = { params: { id: "1" }, body: { Comment: "hello" } };
    const res = mockRes();

    const rec = {
      parentWID: null,
      update: jest.fn().mockResolvedValue(),
      save: jest.fn().mockResolvedValue(),
    };

    models.Work.findByPk.mockResolvedValue(rec);

    await workController.update(req, res);

    expect(rec.update).toHaveBeenCalled();
    expect(updateProblemStatusIfNeeded).not.toHaveBeenCalled();
    expect(t.commit).toHaveBeenCalled();
  });

  it("updates State for normal work => sets Date + save + updateProblemStatus", async () => {
    fixedDateNow("2025-01-03T10:00:00Z");
    const req = { params: { id: "1" }, body: { State: "Done" } };
    const res = mockRes();

    const rec = {
      WID: 1,
      parentWID: null,
      update: jest.fn().mockResolvedValue(),
      save: jest.fn().mockResolvedValue(),
    };
    models.Work.findByPk.mockResolvedValue(rec);

    await workController.update(req, res);

    expect(rec.Date).toBeInstanceOf(Date);
    expect(rec.save).toHaveBeenCalled();
    expect(updateProblemStatusIfNeeded).toHaveBeenCalledWith(rec, t);
    expect(t.commit).toHaveBeenCalled();
  });

  it("updates State for subtask => recalcParentState called", async () => {
    fixedDateNow("2025-01-03T10:00:00Z");
    const req = { params: { id: "2" }, body: { State: "Done" } };
    const res = mockRes();

    const sub = {
      WID: 2,
      parentWID: 500,
      update: jest.fn().mockResolvedValue(),
      save: jest.fn().mockResolvedValue(),
    };
    const parent = { WID: 500, parentWID: null, save: jest.fn().mockResolvedValue() };

    models.Work.findByPk.mockImplementation((id) => {
      if (id === 2) return Promise.resolve(sub);
      if (id === 500) return Promise.resolve(parent);
      return Promise.resolve(null);
    });

    // recalcParentState subtasks for parentWID=500
    models.Work.findAll.mockImplementation(({ where }) => {
      if (where.parentWID === 500) return Promise.resolve([{ State: "Done", Date: "2025-01-01" }]);
      return Promise.resolve([]);
    });

    await workController.update(req, res);

    expect(parent.save).toHaveBeenCalled();
    expect(updateProblemStatusIfNeeded).toHaveBeenCalledWith(parent, t);
    expect(updateProblemStatusIfNeeded).toHaveBeenCalledWith(sub, t);
  });

  it("500 on update error", async () => {
    const req = { params: { id: "1" }, body: { Comment: "x" } };
    const res = mockRes();

    models.Work.findByPk.mockRejectedValue(new Error("db"));

    await workController.update(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "db" });
  });
});

// ==========================================================================
// DELETE
// ==========================================================================
describe("workController.delete", () => {
  it("500 work not found", async () => {
    const req = { params: { id: "1" } };
    const res = mockRes();

    models.Work.findByPk.mockResolvedValue(null);

    await workController.delete(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Work not found" });
  });

  it("deletes parent + subtasks", async () => {
    const req = { params: { id: "1" } };
    const res = mockRes();

    const rec = {
      WID: 1,
      parentWID: null,
      destroy: jest.fn().mockResolvedValue(),
    };

    models.Work.findByPk.mockResolvedValue(rec);
    models.Work.destroy.mockResolvedValue();

    await workController.delete(req, res);

    expect(models.Work.destroy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { parentWID: 1 } })
    );
    expect(rec.destroy).toHaveBeenCalled();
    expect(t.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: "Work deleted" });
  });

  it("deletes subtask only (no bulk destroy)", async () => {
    const req = { params: { id: "2" } };
    const res = mockRes();

    const rec = {
      WID: 2,
      parentWID: 999,
      destroy: jest.fn().mockResolvedValue(),
    };

    models.Work.findByPk.mockResolvedValue(rec);

    await workController.delete(req, res);

    expect(models.Work.destroy).not.toHaveBeenCalled();
    expect(rec.destroy).toHaveBeenCalled();
    expect(t.commit).toHaveBeenCalled();
  });

  it("500 on delete error", async () => {
    const req = { params: { id: "1" } };
    const res = mockRes();

    models.Work.findByPk.mockRejectedValue(new Error("db"));

    await workController.delete(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "db" });
  });
});
