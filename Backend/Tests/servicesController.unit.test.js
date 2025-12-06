const mockResponse = require("./mockRes");
const servicesController = require("../Controllers/servicesController");

// Mock DB
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
      Services: {
        create: jest.fn(),
        findAll: jest.fn(),
        findByPk: jest.fn(),
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

afterEach(() => {
  jest.restoreAllMocks();
});

// ============================================================
// CREATE
// ============================================================
describe("servicesController.create", () => {
  it("returns 400 when missing fields", async () => {
    const req = { body: { Part: "Engine" } }; // missing Name
    const res = mockResponse();

    await servicesController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Part and Name are required",
    });
  });

  it("creates service successfully", async () => {
    const req = { body: { Part: "Engine", Name: "Oil change" } };
    const res = mockResponse();

    const created = { SID: 1, Part: "Engine", Name: "Oil change" };
    models.Services.create.mockResolvedValue(created);

    await servicesController.create(req, res);

    expect(models.Services.create).toHaveBeenCalledWith(
      { Part: "Engine", Name: "Oil change" },
      { transaction: t }
    );
    expect(t.commit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(created);
  });

  it("returns 500 on error", async () => {
    const req = { body: { Part: "Engine", Name: "Oil change" } };
    const res = mockResponse();

    models.Services.create.mockRejectedValue(new Error("DB error"));

    await servicesController.create(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Error while creating service",
    });
  });
});

// ============================================================
// LIST
// ============================================================
describe("servicesController.list", () => {
  it("returns list", async () => {
    const req = {};
    const res = mockResponse();

    const list = [{ SID: 1 }, { SID: 2 }];
    models.Services.findAll.mockResolvedValue(list);

    await servicesController.list(req, res);

    expect(models.Services.findAll).toHaveBeenCalledWith({
      order: [["SID", "ASC"]],
    });
    expect(res.json).toHaveBeenCalledWith(list);
  });

  it("returns 500 on error", async () => {
    const req = {};
    const res = mockResponse();

    models.Services.findAll.mockRejectedValue(new Error("err"));

    await servicesController.list(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Error while getting services",
    });
  });
});

// ============================================================
// GET ONE
// ============================================================
describe("servicesController.getOne", () => {
  it("returns 404 when not found", async () => {
    const req = { params: { id: "1" } };
    const res = mockResponse();

    models.Services.findByPk.mockResolvedValue(null);

    await servicesController.getOne(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "Service not found",
    });
  });

  it("returns service", async () => {
    const req = { params: { id: "1" } };
    const res = mockResponse();

    const service = { SID: 1, Part: "Engine" };
    models.Services.findByPk.mockResolvedValue(service);

    await servicesController.getOne(req, res);

    expect(res.json).toHaveBeenCalledWith(service);
  });

  it("returns 500 on error", async () => {
    const req = { params: { id: "1" } };
    const res = mockResponse();

    models.Services.findByPk.mockRejectedValue(new Error("err"));

    await servicesController.getOne(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Error while getting service",
    });
  });
});

// ============================================================
// UPDATE
// ============================================================
describe("servicesController.update", () => {
  it("returns 404 when not found", async () => {
    const req = { params: { id: "1" }, body: {} };
    const res = mockResponse();

    models.Services.findByPk.mockResolvedValue(null);

    await servicesController.update(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "Service not found",
    });
  });

  it("updates service successfully", async () => {
    const req = {
      params: { id: "1" },
      body: { Part: "NewPart", Name: "NewName" },
    };
    const res = mockResponse();

    models.Services.findByPk
      .mockResolvedValueOnce({ SID: 1 }) // first find
      .mockResolvedValueOnce({
        SID: 1,
        Part: "NewPart",
        Name: "NewName",
      }); // refreshed

    await servicesController.update(req, res);

    expect(models.Services.update).toHaveBeenCalledWith(
      { Part: "NewPart", Name: "NewName" },
      { where: { SID: 1 }, transaction: t }
    );
    expect(t.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      SID: 1,
      Part: "NewPart",
      Name: "NewName",
    });
  });

  it("returns 500 on error", async () => {
    const req = { params: { id: "1" }, body: {} };
    const res = mockResponse();

    models.Services.findByPk.mockRejectedValue(new Error("err"));

    await servicesController.update(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Error while updating service",
    });
  });
});

// ============================================================
// DELETE
// ============================================================
describe("servicesController.delete", () => {
  it("returns 404 when not found", async () => {
    const req = { params: { id: "1" } };
    const res = mockResponse();

    models.Services.findByPk.mockResolvedValue(null);

    await servicesController.delete(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "Service not found",
    });
  });

  it("deletes service", async () => {
    const req = { params: { id: "1" } };
    const res = mockResponse();

    models.Services.findByPk.mockResolvedValue({ SID: 1 });

    await servicesController.delete(req, res);

    expect(models.Services.destroy).toHaveBeenCalledWith({
      where: { SID: 1 },
      transaction: t,
    });
    expect(t.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      message: "Service deleted",
    });
  });

  it("returns 500 on error", async () => {
    const req = { params: { id: "1" } };
    const res = mockResponse();

    models.Services.findByPk.mockRejectedValue(new Error("err"));

    await servicesController.delete(req, res);

    expect(t.rollback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Error while deleting service",
    });
  });
});
