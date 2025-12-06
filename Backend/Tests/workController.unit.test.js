const mockRes = require("./mockRes");
const workController = require("../Controllers/workController");

// ==========================================================================
//  MOCK DB & TRANSACTIONS
// ==========================================================================

jest.mock("../Database/db", () => {
  const mockTransaction = {
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    LOCK: { UPDATE: "UPDATE" },
  };

  return {
    sequelize: {
      transaction: jest.fn().mockImplementation(async () => mockTransaction),
    },
    models: {
      Boats: { findByPk: jest.fn() },
      Services: { findByPk: jest.fn() },
      Seasons: { findByPk: jest.fn() },

      Work: {
        findAll: jest.fn(),
        findByPk: jest.fn(),
        create: jest.fn(),
        destroy: jest.fn(),
        update: jest.fn(),
      },

      Problems: { findOne: jest.fn() },
      User: {},
      Boathalls: {},
    },

    __mockTransaction: mockTransaction,
  };
});

const { models, sequelize, __mockTransaction: t } = require("../Database/db");

// ==========================================================================
//  BEFORE EACH
// ==========================================================================

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

// ==========================================================================
//  CREATE
// ==========================================================================

describe("workController.create", () => {
  it("500 boat not found", async () => {
    const req = { body: { SID: 1, BID: 99, seasonID: 3 } };
    const res = mockRes();

    models.Boats.findByPk.mockResolvedValue(null);

    await workController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("500 service not found", async () => {
    const req = { body: { SID: 1, BID: 2, seasonID: 3 } };
    const res = mockRes();

    models.Boats.findByPk.mockResolvedValue({});
    models.Services.findByPk.mockResolvedValue(null);

    await workController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("500 season not found", async () => {
    const req = { body: { SID: 1, BID: 2, seasonID: 3 } };
    const res = mockRes();

    models.Boats.findByPk.mockResolvedValue({});
    models.Services.findByPk.mockResolvedValue({});
    models.Seasons.findByPk.mockResolvedValue(null);

    await workController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("500 invalid state", async () => {
    const req = { body: { SID: 1, BID: 2, seasonID: 3, State: "XXX" } };
    const res = mockRes();

    models.Boats.findByPk.mockResolvedValue({});
    models.Services.findByPk.mockResolvedValue({});
    models.Seasons.findByPk.mockResolvedValue({});

    await workController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("creates valid subtask and nulls HR/UID", async () => {
    const req = { body: { SID: 1, BID: 2, seasonID: 3, parentWID: 5, HR: 99, UID: 77 } };
    const res = mockRes();

    models.Boats.findByPk.mockResolvedValue({});
    models.Services.findByPk.mockResolvedValue({});
    models.Seasons.findByPk.mockResolvedValue({});
    models.Work.findByPk.mockResolvedValue({ WID: 5, parentWID: null });
    models.Work.create.mockResolvedValue({ WID: 99 });

    await workController.create(req, res);

    expect(models.Work.create).toHaveBeenCalledWith(
      expect.objectContaining({ HR: null, UID: null }),
      expect.any(Object)
    );
  });

  it("creates main work", async () => {
    const req = { body: { SID: 1, BID: 2, seasonID: 3, State: "ToDo" } };
    const res = mockRes();

    models.Boats.findByPk.mockResolvedValue({});
    models.Services.findByPk.mockResolvedValue({});
    models.Seasons.findByPk.mockResolvedValue({});
    models.Work.create.mockResolvedValue({ WID: 10 });

    await workController.create(req, res);

    expect(t.commit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

// ==========================================================================
// LIST ALL — EXTRA (69–95 missing lines)
// ==========================================================================

describe("workController.listAll extended", () => {
  it("handles DB error", async () => {
    const req = {};
    const res = mockRes();

    models.Work.findAll.mockRejectedValue(new Error("fail"));

    await workController.listAll(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Server error listing works" });
  });
});

// ==========================================================================
// LIST BY BOAT — extra (missing 115)
// ==========================================================================

describe("workController.listByBoat extra coverage", () => {
  it("allows Admin even when not owner", async () => {
    const req = { params: { bid: "1" }, user: { role: "Admin", id: 99 } };
    const res = mockRes();

    models.Boats.findByPk.mockResolvedValue({ BID: 1, UID: 999 });
    models.Work.findAll.mockResolvedValue([{ WID: 1 }]);

    await workController.listByBoat(req, res);

    expect(res.json).toHaveBeenCalledWith([{ WID: 1 }]);
  });

  it("returns 500 on unexpected DB error", async () => {
    const req = { params: { bid: "1" }, user: { role: "Admin", id: 1 } };
    const res = mockRes();

    models.Boats.findByPk.mockRejectedValue(new Error("err"));

    await workController.listByBoat(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error listing boat works",
    });
  });
});

// ==========================================================================
// EMPLOYEE WORKS — extra coverage (missing 139)
// ==========================================================================

describe("employeeWorks extended", () => {
  it("returns empty array", async () => {
    const req = { user: { id: 10 } };
    const res = mockRes();

    models.Work.findAll.mockResolvedValue([]);

    await workController.employeeWorks(req, res);

    expect(res.json).toHaveBeenCalledWith([]);
  });

  it("handles DB error", async () => {
    const req = { user: { id: 10 } };
    const res = mockRes();

    models.Work.findAll.mockRejectedValue(new Error("err"));

    await workController.employeeWorks(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Error fetching employee works",
    });
  });
});

// ==========================================================================
// UPDATE STATE
// ==========================================================================

describe("workController.updateState", () => {
  it("500 invalid state", async () => {
    const req = { params: { id: 1 }, body: { State: "XXX" } };
    const res = mockRes();

    await workController.updateState(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("500 work not found", async () => {
    const req = { params: { id: 2 }, body: { State: "ToDo" } };
    const res = mockRes();

    models.Work.findByPk.mockResolvedValue(null);

    await workController.updateState(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  // MISSING LINE 164 — rec.Date set only if State !== "Done"
  it("sets Date only when State != Done", async () => {
    const req = { params: { id: 5 }, body: { State: "InProgress" } };
    const res = mockRes();

    const rec = {
      WID: 5,
      parentWID: null,
      save: jest.fn().mockResolvedValue(),
    };

    models.Work.findByPk.mockResolvedValue(rec);
    models.Problems.findOne.mockResolvedValue(null);

    await workController.updateState(req, res);

    expect(rec.Date).toBeInstanceOf(Date); // LINE 164 covered
    expect(t.commit).toHaveBeenCalled();
  });

  it("Main work Done resolves problem", async () => {
    const req = { params: { id: 1 }, body: { State: "Done" } };
    const res = mockRes();

    const rec = {
      WID: 1,
      parentWID: null,
      State: "ToDo",
      save: jest.fn().mockResolvedValue(),
    };

    const problem = {
      Status: "InProgress",
      save: jest.fn().mockResolvedValue(),
    };

    models.Work.findByPk.mockResolvedValue(rec);
    models.Problems.findOne.mockResolvedValue(problem);

    await workController.updateState(req, res);

    expect(rec.State).toBe("Done");
    expect(problem.Status).toBe("Resolved");
    expect(t.commit).toHaveBeenCalled();
  });

  it("sets problem InProgress when main work InProgress", async () => {
    const req = { params: { id: 77 }, body: { State: "InProgress" } };
    const res = mockRes();

    const rec = {
      WID: 77,
      parentWID: null,
      save: jest.fn().mockResolvedValue(),
    };

    const problem = {
      Status: "New",
      save: jest.fn().mockResolvedValue(),
    };

    models.Work.findByPk.mockResolvedValue(rec);
    models.Problems.findOne.mockResolvedValue(problem);

    await workController.updateState(req, res);

    expect(problem.Status).toBe("InProgress");
    expect(problem.save).toHaveBeenCalled();
  });

  it("Subtask Done closes parent & resolves problem", async () => {
    const req = { params: { id: 2 }, body: { State: "Done" } };
    const res = mockRes();

    const subRec = {
      WID: 2,
      parentWID: 100,
      State: "ToDo",
      Date: new Date("2025-01-01T08:00:00Z"),
      save: jest.fn().mockResolvedValue(),
    };

    const parent = {
      WID: 100,
      parentWID: null,
      State: "ToDo",
      Date: new Date("2025-01-01T07:00:00Z"),
      save: jest.fn().mockResolvedValue(),
    };

    const subtasks = [
      { WID: 2, State: "Done", Date: new Date("2025-01-01T10:00:00Z") },
      { WID: 3, State: "Done", Date: new Date("2025-01-01T11:00:00Z") },
    ];

    const prob = {
      Status: "InProgress",
      save: jest.fn().mockResolvedValue(),
    };

    models.Work.findByPk.mockImplementation((id) => {
      if (id === 2) return Promise.resolve(subRec);
      if (id === 100) return Promise.resolve(parent);
      return Promise.resolve(null);
    });

    models.Work.findAll.mockResolvedValue(subtasks);
    models.Problems.findOne.mockResolvedValue(prob);

    await workController.updateState(req, res);

    expect(subRec.State).toBe("Done");
    expect(parent.State).toBe("Done");
    expect(parent.Date.getTime()).toBe(new Date("2025-01-01T11:00:00Z").getTime());
    expect(prob.Status).toBe("Resolved");
    expect(t.commit).toHaveBeenCalled();
  });

  it("500 on unexpected DB error", async () => {
    const req = { params: { id: 1 }, body: { State: "Done" } };
    const res = mockRes();

    models.Work.findByPk.mockRejectedValue(new Error("err"));

    await workController.updateState(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ==========================================================================
// UPDATE
// ==========================================================================

describe("workController.update", () => {
  it("500 work not found", async () => {
    const req = { params: { id: 1 }, body: {} };
    const res = mockRes();

    models.Work.findByPk.mockResolvedValue(null);

    await workController.update(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("500 invalid state on update", async () => {
    const req = { params: { id: 1 }, body: { State: "INVALID" } };
    const res = mockRes();

    models.Work.findByPk.mockResolvedValue({ parentWID: null });

    await workController.update(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("updates subtask without HR/UID", async () => {
    const req = { params: { id: 2 }, body: { HR: 5, UID: 7, Comment: "x" } };
    const res = mockRes();

    const rec = {
      parentWID: 100,
      update: jest.fn().mockResolvedValue(),
    };

    models.Work.findByPk.mockResolvedValue(rec);

    await workController.update(req, res);

    expect(rec.update).toHaveBeenCalledWith(
      expect.not.objectContaining({ HR: 5, UID: 7 }),
      expect.any(Object)
    );
    expect(t.commit).toHaveBeenCalled();
  });

  it("updates normal work", async () => {
    const req = { params: { id: 1 }, body: { HR: 3, UID: 2 } };
    const res = mockRes();

    const rec = {
      parentWID: null,
      update: jest.fn().mockResolvedValue(),
    };

    models.Work.findByPk.mockResolvedValue(rec);

    await workController.update(req, res);

    expect(rec.update).toHaveBeenCalled();
    expect(t.commit).toHaveBeenCalled();
  });

  it("500 on update error", async () => {
    const req = { params: { id: 5 }, body: {} };
    const res = mockRes();

    models.Work.findByPk.mockRejectedValue(new Error("err"));

    await workController.update(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ==========================================================================
// DELETE
// ==========================================================================

describe("workController.delete", () => {
  it("500 work not found", async () => {
    const req = { params: { id: 1 } };
    const res = mockRes();

    models.Work.findByPk.mockResolvedValue(null);

    await workController.delete(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("deletes parent and subtasks", async () => {
    const req = { params: { id: 1 } };
    const res = mockRes();

    const rec = {
      WID: 1,
      parentWID: null,
      destroy: jest.fn().mockResolvedValue(),
    };

    models.Work.findByPk.mockResolvedValue(rec);
    models.Work.destroy.mockResolvedValue();

    await workController.delete(req, res);

    expect(models.Work.destroy).toHaveBeenCalled();
    expect(rec.destroy).toHaveBeenCalled();
    expect(t.commit).toHaveBeenCalled();
  });

  it("deletes subtask only", async () => {
    const req = { params: { id: 2 } };
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
    const req = { params: { id: 1 } };
    const res = mockRes();

    models.Work.findByPk.mockRejectedValue(new Error("err"));

    await workController.delete(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
