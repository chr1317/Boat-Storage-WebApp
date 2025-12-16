const mockRes = require("./mockRes");
const controller = require("../Controllers/outRequestsController");

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
      BoatOutRequest: {
        findOne: jest.fn(),
        findAll: jest.fn(),
        findByPk: jest.fn(),
        create: jest.fn(),
      },
      BoatStorage: {
        findByPk: jest.fn(),
      },
      Boats: {
        findByPk: jest.fn(),
        count: jest.fn(),
      },
      Work: {
        count: jest.fn(),
      },
      Seasons: {},
      User: {},
      Boathalls: {},
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
describe("outRequestsController.create", () => {
  it("400 missing required fields", async () => {
    const res = mockRes();

    await controller.create(
      { body: {}, user: { id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(t.rollback).toHaveBeenCalled();
  });

  it("400 invalid type", async () => {
    const res = mockRes();

    await controller.create(
      {
        body: {
          AID: 1,
          type: "BAD",
          preferredWeekStart: "2025-05-01",
          preferredWeekEnd: "2025-05-07",
        },
        user: { id: 1 },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("400 BoatStorage not found", async () => {
    const res = mockRes();
    models.BoatStorage.findByPk.mockResolvedValue(null);

    await controller.create(
      {
        body: {
          AID: 1,
          type: "Launch",
          preferredWeekStart: "2025-05-01",
          preferredWeekEnd: "2025-05-07",
        },
        user: { id: 1 },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("404 boat not found", async () => {
    const res = mockRes();
    models.BoatStorage.findByPk.mockResolvedValue({
      AID: 1,
      BID: 10,
      seasonID: 20,
    });
    models.Boats.findByPk.mockResolvedValue(null);

    await controller.create(
      {
        body: {
          AID: 1,
          type: "Launch",
          preferredWeekStart: "2025-05-01",
          preferredWeekEnd: "2025-05-07",
        },
        user: { id: 1 },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("400 launch outside allowed months", async () => {
    const res = mockRes();
    models.BoatStorage.findByPk.mockResolvedValue({
      AID: 1,
      BID: 10,
      seasonID: 20,
    });
    models.Boats.findByPk.mockResolvedValue({});

    await controller.create(
      {
        body: {
          AID: 1,
          type: "Launch",
          preferredWeekStart: "2025-01-01",
          preferredWeekEnd: "2025-01-07",
        },
        user: { id: 1 },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("409 pending request already exists", async () => {
    const res = mockRes();
    models.BoatStorage.findByPk.mockResolvedValue({
      AID: 1,
      BID: 10,
      seasonID: 20,
    });
    models.Boats.findByPk.mockResolvedValue({});
    models.BoatOutRequest.findOne.mockResolvedValue({ id: 99 });

    await controller.create(
      {
        body: {
          AID: 1,
          type: "Trailer",
          preferredWeekStart: "2025-05-01",
          preferredWeekEnd: "2025-05-07",
        },
        user: { id: 1 },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("400 too short lead time (no works)", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2025-05-01"));

    const res = mockRes();
    models.BoatStorage.findByPk.mockResolvedValue({
      AID: 1,
      BID: 10,
      seasonID: 20,
    });
    models.Boats.findByPk.mockResolvedValue({});
    models.BoatOutRequest.findOne.mockResolvedValue(null);
    models.Work.count.mockResolvedValue(0);

    await controller.create(
      {
        body: {
          AID: 1,
          type: "Trailer",
          preferredWeekStart: "2025-05-02",
          preferredWeekEnd: "2025-05-08",
        },
        user: { id: 1 },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    jest.useRealTimers();
  });

  it("201 creates request (works present, long lead)", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2025-04-01"));

    const res = mockRes();
    models.BoatStorage.findByPk.mockResolvedValue({
      AID: 1,
      BID: 10,
      seasonID: 20,
    });
    models.Boats.findByPk.mockResolvedValue({});
    models.BoatOutRequest.findOne.mockResolvedValue(null);
    models.Work.count.mockResolvedValue(5);
    models.BoatOutRequest.create.mockResolvedValue({ id: 1 });

    await controller.create(
      {
        body: {
          AID: 1,
          type: "Launch",
          preferredWeekStart: "2025-05-01",
          preferredWeekEnd: "2025-05-07",
        },
        user: { id: 7 },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(t.commit).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it("500 catch", async () => {
    const res = mockRes();
    models.BoatStorage.findByPk.mockRejectedValue(new Error("db"));

    await controller.create(
      {
        body: {
          AID: 1,
          type: "Trailer",
          preferredWeekStart: "2025-05-01",
          preferredWeekEnd: "2025-05-07",
        },
        user: { id: 1 },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ==========================================================================
// LIST ALL
// ==========================================================================
describe("outRequestsController.listAll", () => {
  it("400 invalid AID", async () => {
    const res = mockRes();
    await controller.listAll({ query: { AID: "x" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns list", async () => {
    const res = mockRes();
    models.BoatOutRequest.findAll.mockResolvedValue([{ id: 1 }]);

    await controller.listAll({ query: {} }, res);

    expect(res.json).toHaveBeenCalled();
  });

  it("500 on error", async () => {
    const res = mockRes();
    models.BoatOutRequest.findAll.mockRejectedValue(new Error());

    await controller.listAll({ query: {} }, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ==========================================================================
// LIST MINE
// ==========================================================================
describe("outRequestsController.listMine", () => {
  it("400 invalid AID", async () => {
    const res = mockRes();
    await controller.listMine(
      { query: { AID: "x" }, user: { role: "Client", id: 1 } },
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("client gets own", async () => {
    const res = mockRes();
    models.BoatOutRequest.findAll.mockResolvedValue([{ id: 1 }]);

    await controller.listMine(
      { query: {}, user: { role: "Client", id: 5 } },
      res
    );

    expect(res.json).toHaveBeenCalled();
  });

  it("staff gets all", async () => {
    const res = mockRes();
    models.BoatOutRequest.findAll.mockResolvedValue([{ id: 2 }]);

    await controller.listMine(
      { query: {}, user: { role: "Admin", id: 1 } },
      res
    );

    expect(res.json).toHaveBeenCalled();
  });

  it("500 on error", async () => {
    const res = mockRes();
    models.BoatOutRequest.findAll.mockRejectedValue(new Error());

    await controller.listMine(
      { query: {}, user: { role: "Admin", id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ==========================================================================
// APPROVE
// ==========================================================================
describe("outRequestsController.approve", () => {
  it("400 missing confirmedDate", async () => {
    const res = mockRes();

    await controller.approve(
      { params: { id: "1" }, body: {}, user: { id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("404 not found", async () => {
    const res = mockRes();
    models.BoatOutRequest.findByPk.mockResolvedValue(null);

    await controller.approve(
      { params: { id: "1" }, body: { confirmedDate: "2025-05-01" }, user: { id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("400 not pending", async () => {
    const res = mockRes();
    models.BoatOutRequest.findByPk.mockResolvedValue({ status: "Accepted" });

    await controller.approve(
      { params: { id: "1" }, body: { confirmedDate: "2025-05-01" }, user: { id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("400 chosen outside week", async () => {
    const res = mockRes();
    models.BoatOutRequest.findByPk.mockResolvedValue({
      status: "Pending",
      preferredWeekStart: "2025-05-10",
      preferredWeekEnd: "2025-05-17",
    });

    await controller.approve(
      { params: { id: "1" }, body: { confirmedDate: "2025-05-01" }, user: { id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("409 daily limit reached", async () => {
    const res = mockRes();
    models.BoatOutRequest.findByPk.mockResolvedValue({
      status: "Pending",
      preferredWeekStart: "2025-05-01",
      preferredWeekEnd: "2025-05-07",
      BID: 10,
    });
    models.Boats.count.mockResolvedValue(5);

    await controller.approve(
      { params: { id: "1" }, body: { confirmedDate: "2025-05-03" }, user: { id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("approves request", async () => {
    const res = mockRes();
    const boat = { save: jest.fn() };
    const reqRec = {
      status: "Pending",
      BID: 10,
      preferredWeekStart: "2025-05-01",
      preferredWeekEnd: "2025-05-07",
      save: jest.fn(),
    };

    models.BoatOutRequest.findByPk.mockResolvedValue(reqRec);
    models.Boats.count.mockResolvedValue(0);
    models.Boats.findByPk.mockResolvedValue(boat);

    await controller.approve(
      { params: { id: "1" }, body: { confirmedDate: "2025-05-03" }, user: { id: 9 } },
      res
    );

    expect(reqRec.status).toBe("Accepted");
    expect(t.commit).toHaveBeenCalled();
  });

  it("500 catch", async () => {
    const res = mockRes();
    models.BoatOutRequest.findByPk.mockRejectedValue(new Error());

    await controller.approve(
      { params: { id: "1" }, body: { confirmedDate: "2025-05-03" }, user: { id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ==========================================================================
// REJECT
// ==========================================================================
describe("outRequestsController.reject", () => {
  it("404 not found", async () => {
    const res = mockRes();
    models.BoatOutRequest.findByPk.mockResolvedValue(null);

    await controller.reject(
      { params: { id: "1" }, body: {}, user: { id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("400 not pending", async () => {
    const res = mockRes();
    models.BoatOutRequest.findByPk.mockResolvedValue({ status: "Accepted" });

    await controller.reject(
      { params: { id: "1" }, body: {}, user: { id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects request", async () => {
    const res = mockRes();
    const rec = { status: "Pending", save: jest.fn() };
    models.BoatOutRequest.findByPk.mockResolvedValue(rec);

    await controller.reject(
      { params: { id: "1" }, body: { reason: "Nope" }, user: { id: 5 } },
      res
    );

    expect(rec.status).toBe("Rejected");
    expect(t.commit).toHaveBeenCalled();
  });

  it("500 catch", async () => {
    const res = mockRes();
    models.BoatOutRequest.findByPk.mockRejectedValue(new Error());

    await controller.reject(
      { params: { id: "1" }, body: {}, user: { id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ==========================================================================
// CANCEL
// ==========================================================================
describe("outRequestsController.cancel", () => {
  it("404 not found", async () => {
    const res = mockRes();
    models.BoatOutRequest.findByPk.mockResolvedValue(null);

    await controller.cancel(
      { params: { id: "1" }, user: { role: "Admin", id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("400 not pending", async () => {
    const res = mockRes();
    models.BoatOutRequest.findByPk.mockResolvedValue({ status: "Accepted" });

    await controller.cancel(
      { params: { id: "1" }, user: { role: "Admin", id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("403 client forbidden", async () => {
    const res = mockRes();
    models.BoatOutRequest.findByPk.mockResolvedValue({
      status: "Pending",
      requestedBy: 9,
    });

    await controller.cancel(
      { params: { id: "1" }, user: { role: "Client", id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("client cancels own", async () => {
    const res = mockRes();
    const rec = { status: "Pending", requestedBy: 5, save: jest.fn() };
    models.BoatOutRequest.findByPk.mockResolvedValue(rec);

    await controller.cancel(
      { params: { id: "1" }, user: { role: "Client", id: 5 } },
      res
    );

    expect(rec.status).toBe("Cancelled");
    expect(t.commit).toHaveBeenCalled();
  });

  it("staff cancels", async () => {
    const res = mockRes();
    const rec = { status: "Pending", requestedBy: 5, save: jest.fn() };
    models.BoatOutRequest.findByPk.mockResolvedValue(rec);

    await controller.cancel(
      { params: { id: "1" }, user: { role: "Admin", id: 1 } },
      res
    );

    expect(rec.status).toBe("Cancelled");
  });

  it("500 catch", async () => {
    const res = mockRes();
    models.BoatOutRequest.findByPk.mockRejectedValue(new Error());

    await controller.cancel(
      { params: { id: "1" }, user: { role: "Admin", id: 1 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
