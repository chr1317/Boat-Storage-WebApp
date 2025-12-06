const mockResponse = require("./mockRes");
const outRequestsController = require("../Controllers/outRequestsController");

// --- MOCK DB ---
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
        count: jest.fn(),
      },
      BoatStorage: {
        findOne: jest.fn(),
      },
      Work: {
        count: jest.fn(),
      },
      BoatOutRequest: {
        findOne: jest.fn(),
        findAll: jest.fn(),
        findByPk: jest.fn(),
        create: jest.fn(),
      },
      Seasons: {
        // tylko do include, nie musimy nic mockować tutaj
      },
      User: {
        // do include
      },
      Boathalls: {
        // do include
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

afterEach(() => {
  jest.restoreAllMocks();
});

// ======================================================================
// CREATE
// ======================================================================
describe("outRequestsController.create", () => {
  it("returns 400 if required fields are missing", async () => {
    const req = { body: {}, user: { role: "Client", id: 1 } };
    const res = mockResponse();

    await outRequestsController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Missing required fields",
    });
  });

  it("returns 400 if type invalid", async () => {
    const req = {
      body: {
        BID: 1,
        type: "InvalidType",
        preferredWeekStart: "2030-05-01",
        preferredWeekEnd: "2030-05-07",
      },
      user: { role: "Client", id: 1 },
    };
    const res = mockResponse();

    await outRequestsController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid type" });
  });

  it("returns 404 if boat not found", async () => {
    const req = {
      body: {
        BID: 1,
        type: "Launch",
        preferredWeekStart: "2030-05-01",
        preferredWeekEnd: "2030-05-07",
      },
      user: { role: "Client", id: 1 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue(null);

    await outRequestsController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Boat not found" });
  });

  it("returns 400 if Launch outside allowed months", async () => {
    const req = {
      body: {
        BID: 1,
        type: "Launch",
        preferredWeekStart: "2030-01-10", // styczeń -> poza 4–9
        preferredWeekEnd: "2030-01-17",
      },
      user: { role: "Client", id: 1 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue({ BID: 1, UID: 1 });

    models.BoatStorage.findOne.mockResolvedValue(null);
    models.Work.count.mockResolvedValue(0);
    models.BoatOutRequest.findOne.mockResolvedValue(null);

    await outRequestsController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Launch is only allowed between April and September",
    });
  });

  it("returns 403 if client is not owner", async () => {
    const req = {
      body: {
        BID: 1,
        type: "Trailer",
        preferredWeekStart: "2030-05-10",
        preferredWeekEnd: "2030-05-17",
      },
      user: { role: "Client", id: 99 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue({ BID: 1, UID: 1 });

    await outRequestsController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
  });

  it("returns 409 if pending request already exists", async () => {
    const req = {
      body: {
        BID: 1,
        type: "Trailer",
        preferredWeekStart: "2030-05-10",
        preferredWeekEnd: "2030-05-17",
      },
      user: { role: "Admin", id: 1 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue({ BID: 1, UID: 10 });
    models.BoatStorage.findOne.mockResolvedValue({ seasonID: 5 });
    models.BoatOutRequest.findOne.mockResolvedValue({ id: 123, status: "Pending" });

    await outRequestsController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "Pending request already exists for this boat",
    });
  });

  it("returns 400 if minimal lead time not met (too soon)", async () => {
    const req = {
      body: {
        BID: 1,
        type: "Trailer",
        preferredWeekStart: "2000-01-10", // przeszłość -> diffDays < 3
        preferredWeekEnd: "2000-01-17",
      },
      user: { role: "Admin", id: 1 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue({ BID: 1, UID: 10 });
    models.BoatStorage.findOne.mockResolvedValue({ seasonID: 5 });
    models.BoatOutRequest.findOne.mockResolvedValue(null);
    models.Work.count.mockResolvedValue(0);

    await outRequestsController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("Minimal lead time"),
      })
    );
  });

  it("creates Trailer request successfully", async () => {
    const req = {
      body: {
        BID: 1,
        type: "Trailer",
        preferredWeekStart: "2030-05-10",
        preferredWeekEnd: "2030-05-17",
        comment: "pls",
      },
      user: { role: "Admin", id: 7 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockResolvedValue({ BID: 1, UID: 10 });
    models.BoatStorage.findOne.mockResolvedValue({ seasonID: 5 });
    models.BoatOutRequest.findOne.mockResolvedValue(null);
    models.Work.count.mockResolvedValue(0);

    const created = {
      id: 123,
      BID: 1,
      seasonID: 5,
      requestedBy: 7,
      type: "Trailer",
    };
    models.BoatOutRequest.create.mockResolvedValue(created);

    await outRequestsController.create(req, res);

    expect(models.BoatOutRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        BID: 1,
        seasonID: 5,
        requestedBy: 7,
        type: "Trailer",
        status: "Pending",
      }),
      expect.any(Object)
    );
    expect(t.commit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(created);
  });

  it("returns 500 on error", async () => {
    const req = {
      body: {
        BID: 1,
        type: "Trailer",
        preferredWeekStart: "2030-05-10",
        preferredWeekEnd: "2030-05-17",
      },
      user: { role: "Admin", id: 1 },
    };
    const res = mockResponse();

    models.Boats.findByPk.mockRejectedValue(new Error("boom"));

    await outRequestsController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while creating out request",
    });
  });
});

// ======================================================================
// listAll
// ======================================================================
describe("outRequestsController.listAll", () => {
  it("returns all requests without status filter", async () => {
    const req = { query: {} };
    const res = mockResponse();

    const list = [{ id: 1 }, { id: 2 }];
    models.BoatOutRequest.findAll.mockResolvedValue(list);

    await outRequestsController.listAll(req, res);

    expect(models.BoatOutRequest.findAll).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(list);
  });

  it("applies valid status filter", async () => {
    const req = { query: { status: "Pending" } };
    const res = mockResponse();

    const list = [{ id: 1, status: "Pending" }];
    models.BoatOutRequest.findAll.mockResolvedValue(list);

    await outRequestsController.listAll(req, res);

    expect(models.BoatOutRequest.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "Pending" },
      })
    );
    expect(res.json).toHaveBeenCalledWith(list);
  });

  it("returns 500 on error", async () => {
    const req = { query: {} };
    const res = mockResponse();

    models.BoatOutRequest.findAll.mockRejectedValue(new Error("err"));

    await outRequestsController.listAll(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while listing out requests",
    });
  });
});

// ======================================================================
// listMine
// ======================================================================
describe("outRequestsController.listMine", () => {
  it("client gets only his requests", async () => {
    const req = { user: { role: "Client", id: 5 } };
    const res = mockResponse();

    const list = [{ id: 1, requestedBy: 5 }];
    models.BoatOutRequest.findAll.mockResolvedValue(list);

    await outRequestsController.listMine(req, res);

    expect(models.BoatOutRequest.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { requestedBy: 5 },
      })
    );
    expect(res.json).toHaveBeenCalledWith(list);
  });

  it("staff gets all requests", async () => {
    const req = { user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    const list = [{ id: 1 }, { id: 2 }];
    models.BoatOutRequest.findAll.mockResolvedValue(list);

    await outRequestsController.listMine(req, res);

    expect(models.BoatOutRequest.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      })
    );
    expect(res.json).toHaveBeenCalledWith(list);
  });

  it("returns 500 on error", async () => {
    const req = { user: { role: "Client", id: 5 } };
    const res = mockResponse();

    models.BoatOutRequest.findAll.mockRejectedValue(new Error("err"));

    await outRequestsController.listMine(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while listing my out requests",
    });
  });
});

// ======================================================================
// approve
// ======================================================================
describe("outRequestsController.approve", () => {
  it("returns 400 if confirmedDate missing", async () => {
    const req = { params: { id: "1" }, body: {}, user: { role: "Admin", id: 10 } };
    const res = mockResponse();

    await outRequestsController.approve(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "confirmedDate is required",
    });
  });

  it("returns 404 if request not found", async () => {
    const req = {
      params: { id: "1" },
      body: { confirmedDate: "2030-05-10" },
      user: { role: "Admin", id: 10 },
    };
    const res = mockResponse();

    models.BoatOutRequest.findByPk.mockResolvedValue(null);

    await outRequestsController.approve(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Request not found" });
  });

  it("returns 400 if status is not Pending", async () => {
    const req = {
      params: { id: "1" },
      body: { confirmedDate: "2030-05-10" },
      user: { role: "Admin", id: 10 },
    };
    const res = mockResponse();

    models.BoatOutRequest.findByPk.mockResolvedValue({
      id: 1,
      status: "Accepted",
    });

    await outRequestsController.approve(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Only pending requests can be approved",
    });
  });

  it("returns 400 if chosen date outside requested week", async () => {
    const req = {
      params: { id: "1" },
      body: { confirmedDate: "2030-05-20" },
      user: { role: "Admin", id: 10 },
    };
    const res = mockResponse();

    models.BoatOutRequest.findByPk.mockResolvedValue({
      id: 1,
      status: "Pending",
      BID: 5,
      preferredWeekStart: "2030-05-01",
      preferredWeekEnd: "2030-05-07",
    });

    await outRequestsController.approve(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Chosen date is outside requested week",
    });
  });

  it("returns 409 if daily limit reached", async () => {
    const req = {
      params: { id: "1" },
      body: { confirmedDate: "2030-05-05" },
      user: { role: "Admin", id: 10 },
    };
    const res = mockResponse();

    models.BoatOutRequest.findByPk.mockResolvedValue({
      id: 1,
      status: "Pending",
      BID: 5,
      preferredWeekStart: "2030-05-01",
      preferredWeekEnd: "2030-05-07",
    });

    models.Boats.count.mockResolvedValue(5); // >= MAX_OUT_PER_DAY (2 domyślnie)

    await outRequestsController.approve(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "Daily limit reached, choose another day",
    });
  });

  it("approves request and sets boat.out", async () => {
    const req = {
      params: { id: "1" },
      body: { confirmedDate: "2030-05-05T10:00:00.000Z" },
      user: { role: "Admin", id: 10 },
    };
    const res = mockResponse();

    const reqRec = {
      id: 1,
      status: "Pending",
      BID: 5,
      preferredWeekStart: "2030-05-01T00:00:00.000Z",
      preferredWeekEnd: "2030-05-10T00:00:00.000Z",
      save: jest.fn().mockResolvedValue(),
    };

    models.BoatOutRequest.findByPk.mockResolvedValue(reqRec);
    models.Boats.count.mockResolvedValue(0);

    const boat = {
      BID: 5,
      out: null,
      save: jest.fn().mockResolvedValue(),
    };
    models.Boats.findByPk = jest.fn().mockResolvedValue(boat);

    await outRequestsController.approve(req, res);

    expect(boat.save).toHaveBeenCalled();
    expect(reqRec.status).toBe("Accepted");
    expect(reqRec.handledBy).toBe(10);
    expect(reqRec.save).toHaveBeenCalled();
    expect(t.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(reqRec);
  });

  it("returns 500 on error", async () => {
    const req = {
      params: { id: "1" },
      body: { confirmedDate: "2030-05-05" },
      user: { role: "Admin", id: 10 },
    };
    const res = mockResponse();

    models.BoatOutRequest.findByPk.mockRejectedValue(new Error("err"));

    await outRequestsController.approve(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while approving request",
    });
  });
});

// ======================================================================
// reject
// ======================================================================
describe("outRequestsController.reject", () => {
  it("returns 404 if request not found", async () => {
    const req = { params: { id: "1" }, body: { reason: "x" }, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    models.BoatOutRequest.findByPk.mockResolvedValue(null);

    await outRequestsController.reject(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Request not found" });
  });

  it("returns 400 if status not Pending", async () => {
    const req = { params: { id: "1" }, body: { reason: "x" }, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    models.BoatOutRequest.findByPk.mockResolvedValue({
      id: 1,
      status: "Accepted",
    });

    await outRequestsController.reject(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Only pending requests can be rejected",
    });
  });

  it("rejects request", async () => {
    const req = { params: { id: "1" }, body: { reason: "No slots" }, user: { role: "Admin", id: 7 } };
    const res = mockResponse();

    const rec = {
      id: 1,
      status: "Pending",
      save: jest.fn().mockResolvedValue(),
    };
    models.BoatOutRequest.findByPk.mockResolvedValue(rec);

    await outRequestsController.reject(req, res);

    expect(rec.status).toBe("Rejected");
    expect(rec.rejectReason).toBe("No slots");
    expect(rec.handledBy).toBe(7);
    expect(rec.save).toHaveBeenCalled();
    expect(t.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(rec);
  });

  it("returns 500 on error", async () => {
    const req = { params: { id: "1" }, body: { reason: "x" }, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    models.BoatOutRequest.findByPk.mockRejectedValue(new Error("err"));

    await outRequestsController.reject(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while rejecting request",
    });
  });
});

// ======================================================================
// cancel
// ======================================================================
describe("outRequestsController.cancel", () => {
  it("returns 404 if request not found", async () => {
    const req = { params: { id: "1" }, user: { role: "Client", id: 5 } };
    const res = mockResponse();

    models.BoatOutRequest.findByPk.mockResolvedValue(null);

    await outRequestsController.cancel(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Request not found" });
  });

  it("returns 400 if status not Pending", async () => {
    const req = { params: { id: "1" }, user: { role: "Client", id: 5 } };
    const res = mockResponse();

    models.BoatOutRequest.findByPk.mockResolvedValue({
      id: 1,
      status: "Accepted",
    });

    await outRequestsController.cancel(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Only pending requests can be cancelled",
    });
  });

  it("returns 403 if client cancelling someone else's request", async () => {
    const req = { params: { id: "1" }, user: { role: "Client", id: 5 } };
    const res = mockResponse();

    models.BoatOutRequest.findByPk.mockResolvedValue({
      id: 1,
      status: "Pending",
      requestedBy: 999,
    });

    await outRequestsController.cancel(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
  });

  it("client cancels his pending request", async () => {
    const req = { params: { id: "1" }, user: { role: "Client", id: 5 } };
    const res = mockResponse();

    const rec = {
      id: 1,
      status: "Pending",
      requestedBy: 5,
      save: jest.fn().mockResolvedValue(),
    };

    models.BoatOutRequest.findByPk.mockResolvedValue(rec);

    await outRequestsController.cancel(req, res);

    expect(rec.status).toBe("Cancelled");
    expect(rec.save).toHaveBeenCalled();
    expect(t.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(rec);
  });

  it("staff can cancel regardless of requestedBy", async () => {
    const req = { params: { id: "1" }, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    const rec = {
      id: 1,
      status: "Pending",
      requestedBy: 999,
      save: jest.fn().mockResolvedValue(),
    };

    models.BoatOutRequest.findByPk.mockResolvedValue(rec);

    await outRequestsController.cancel(req, res);

    expect(rec.status).toBe("Cancelled");
    expect(t.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(rec);
  });

  it("returns 500 on error", async () => {
    const req = { params: { id: "1" }, user: { role: "Admin", id: 1 } };
    const res = mockResponse();

    models.BoatOutRequest.findByPk.mockRejectedValue(new Error("err"));

    await outRequestsController.cancel(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error while cancelling request",
    });
  });
});
