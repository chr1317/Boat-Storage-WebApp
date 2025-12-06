const mockRes = require("./mockRes");
const bcrypt = require("bcrypt");
const userController = require("../Controllers/userController");

jest.mock("bcrypt", () => ({
  compare: jest.fn(),
  hash: jest.fn()
}));

jest.mock("../Database/db", () => {
  return {
    models: {
      User: {
        findByPk: jest.fn(),
        findAll: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn(),
        create: jest.fn()
      }
    }
  };
});

const { models } = require("../Database/db");

beforeEach(() => {
  jest.clearAllMocks();
});

// =====================================================================
// GET ME
// =====================================================================
describe("userController.getMe", () => {
  it("returns 404 when user not found", async () => {
    const req = { user: { id: 1 } };
    const res = mockRes();

    models.User.findByPk.mockResolvedValue(null);

    await userController.getMe(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns user data", async () => {
    const req = { user: { id: 1 } };
    const res = mockRes();

    models.User.findByPk.mockResolvedValue({ UID: 1, Name: "A" });

    await userController.getMe(req, res);

    expect(res.json).toHaveBeenCalledWith({ UID: 1, Name: "A" });
  });

  it("500 on db error", async () => {
    const req = { user: { id: 1 } };
    const res = mockRes();

    models.User.findByPk.mockRejectedValue(new Error("err"));

    await userController.getMe(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// =====================================================================
// LIST
// =====================================================================
describe("userController.list", () => {
  it("returns list", async () => {
    const req = {};
    const res = mockRes();

    models.User.findAll.mockResolvedValue([{ UID: 1 }]);

    await userController.list(req, res);

    expect(res.json).toHaveBeenCalledWith([{ UID: 1 }]);
  });

  it("500 on error", async () => {
    const req = {};
    const res = mockRes();

    models.User.findAll.mockRejectedValue(new Error("err"));

    await userController.list(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// =====================================================================
// GET ONE
// =====================================================================
describe("userController.getOne", () => {
  it("403 when non-admin accesses another user", async () => {
const req = { params: { id: 2 }, user: { id: 1, role: "Client" }, body: {} };
    const res = mockRes();

    await userController.getOne(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("404 when not found", async () => {
    const req = { params: { id: 1 }, user: { id: 1, role: "Client" } };
    const res = mockRes();

    models.User.findByPk.mockResolvedValue(null);

    await userController.getOne(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns user", async () => {
    const req = { params: { id: 1 }, user: { id: 1, role: "Client" } };
    const res = mockRes();

    models.User.findByPk.mockResolvedValue({ UID: 1 });

    await userController.getOne(req, res);

    expect(res.json).toHaveBeenCalledWith({ UID: 1 });
  });
});

// =====================================================================
// UPDATE ME
// =====================================================================
describe("userController.updateMe", () => {
  it("updates allowed fields", async () => {
    const req = { user: { id: 1 }, body: { Name: "X", City: "Y" } };
    const res = mockRes();

    models.User.update.mockResolvedValue([1]);
    models.User.findByPk.mockResolvedValue({ UID: 1, Name: "X", City: "Y" });

    await userController.updateMe(req, res);

    expect(models.User.update).toHaveBeenCalledWith(
      { Name: "X", City: "Y" },
      { where: { UID: 1 } }
    );

    expect(res.json).toHaveBeenCalledWith({ UID: 1, Name: "X", City: "Y" });
  });

  it("500 on db error", async () => {
    const req = { user: { id: 1 } };
    const res = mockRes();

    models.User.update.mockRejectedValue(new Error("err"));

    await userController.updateMe(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// =====================================================================
// UPDATE (ADMIN / SELF)
// =====================================================================
describe("userController.update", () => {
  it("403 unauthorized", async () => {
    const req = { params: { id: 2 }, user: { id: 1, role: "Client" } };
    const res = mockRes();

    await userController.update(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("404 when user not found", async () => {
    const req = { params: { id: 2 }, user: { id: 2, role: "Client" }, body: {} };
    const res = mockRes();

    models.User.update.mockResolvedValue([0]);

    await userController.update(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("admin updates including Role", async () => {
    const req = {
      params: { id: 5 },
      user: { id: 1, role: "Admin" },
      body: { Name: "A", Role: "Employee" }
    };
    const res = mockRes();

    models.User.update.mockResolvedValue([1]);
    models.User.findByPk.mockResolvedValue({ UID: 5, Name: "A", Role: "Employee" });

    await userController.update(req, res);

    expect(res.json).toHaveBeenCalledWith({ UID: 5, Name: "A", Role: "Employee" });
  });

  it("self update (no Role allowed)", async () => {
    const req = {
      params: { id: 7 },
      user: { id: 7, role: "Client" },
      body: { Name: "Self", Role: "Admin" } // Role ignored
    };
    const res = mockRes();

    models.User.update.mockResolvedValue([1]);
    models.User.findByPk.mockResolvedValue({ UID: 7, Name: "Self" });

    await userController.update(req, res);

    expect(models.User.update).toHaveBeenCalledWith(
      { Name: "Self" },
      { where: { UID: 7 } }
    );
  });

  it("500 on error", async () => {
    const req = { params: { id: 1 }, user: { id: 1, role: "Client" }, body: {} };
    const res = mockRes();

    models.User.update.mockRejectedValue(new Error("err"));

    await userController.update(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// =====================================================================
// UPDATE PASSWORD
// =====================================================================
describe("userController.updatePassword", () => {
  it("403 no access", async () => {
  const req = { 
    params: { id: 2 }, 
    user: { id: 1, role: "Client" },
    body: {}   // ← FIX
  };
  const res = mockRes();

  await userController.updatePassword(req, res);

  expect(res.status).toHaveBeenCalledWith(403);
});


  it("404 user not found", async () => {
    const req = { params: { id: 3 }, user: { id: 3, role: "Client" }, body: {} };
    const res = mockRes();

    models.User.findByPk.mockResolvedValue(null);

    await userController.updatePassword(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("requires old password for non-admin", async () => {
    const req = { params: { id: 3 }, user: { id: 3, role: "Client" }, body: {} };
    const res = mockRes();

    models.User.findByPk.mockResolvedValue({ UID: 3 });

    await userController.updatePassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects wrong old password", async () => {
    const req = {
      params: { id: 3 },
      user: { id: 3, role: "Client" },
      body: { oldPassword: "x", newPassword: "123456" }
    };
    const res = mockRes();

    models.User.findByPk.mockResolvedValue({ Password: "HASH" });
    bcrypt.compare.mockResolvedValue(false);

    await userController.updatePassword(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("400 new password too short", async () => {
    const req = {
      params: { id: 3 },
      user: { id: 3, role: "Client" },
      body: { oldPassword: "ok", newPassword: "12" }
    };
    const res = mockRes();

    models.User.findByPk.mockResolvedValue({ Password: "HASH" });
    bcrypt.compare.mockResolvedValue(true);

    await userController.updatePassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("admin can change without old password", async () => {
    const req = {
      params: { id: 5 },
      user: { role: "Admin" },
      body: { newPassword: "123456" }
    };
    const res = mockRes();

    models.User.findByPk.mockResolvedValue({ UID: 5 });
    bcrypt.hash.mockResolvedValue("HASHED");

    await userController.updatePassword(req, res);

    expect(models.User.update).toHaveBeenCalledWith(
      { Password: "HASHED" },
      { where: { UID: 5 } }
    );
  });

  it("client changes own password", async () => {
    const req = {
      params: { id: 7 },
      user: { id: 7, role: "Client" },
      body: { oldPassword: "old", newPassword: "abcdef" }
    };
    const res = mockRes();

    models.User.findByPk.mockResolvedValue({ Password: "HASHED_OLD" });
    bcrypt.compare.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue("HASHED_NEW");

    await userController.updatePassword(req, res);

    expect(models.User.update).toHaveBeenCalled();
  });
});

// =====================================================================
// DELETE
// =====================================================================
describe("userController.delete", () => {
  it("404 not found", async () => {
    const req = { params: { id: 1 } };
    const res = mockRes();

    models.User.destroy.mockResolvedValue(0);

    await userController.delete(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("deletes user", async () => {
    const req = { params: { id: 1 } };
    const res = mockRes();

    models.User.destroy.mockResolvedValue(1);

    await userController.delete(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: "Użytkownik usunięty" });
  });
});

// =====================================================================
// CREATE USER
// =====================================================================
describe("userController.create", () => {
  it("creates user", async () => {
    const req = {
      body: { Name: "A", Lastname: "B", City: "X", Role: "Client" }
    };
    const res = mockRes();

    bcrypt.hash.mockResolvedValue("HASHED");
    models.User.create.mockResolvedValue({
      toJSON: () => ({
        UID: 10,
        Name: "A",
        Lastname: "B",
        Password: "HASHED"
      })
    });

    await userController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("500 on error", async () => {
    const req = { body: {} };
    const res = mockRes();

    models.User.create.mockRejectedValue(new Error("err"));

    await userController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// =====================================================================
// SET PASSWORD
// =====================================================================
describe("userController.setPassword", () => {
  it("400 invalid new password", async () => {
    const req = { params: { id: 1 }, body: { newPassword: "12" } };
    const res = mockRes();

    await userController.setPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("404 user not found", async () => {
    const req = { params: { id: 1 }, body: { newPassword: "abcdef" } };
    const res = mockRes();

    models.User.findByPk.mockResolvedValue(null);

    await userController.setPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("updates password & clears flag", async () => {
    const req = { params: { id: 1 }, body: { newPassword: "abcdef" } };
    const res = mockRes();

    models.User.findByPk.mockResolvedValue({ UID: 1 });
    bcrypt.hash.mockResolvedValue("HASHED");

    await userController.setPassword(req, res);

    expect(models.User.update).toHaveBeenCalledWith(
      { Password: "HASHED", MustChangePassword: false },
      { where: { UID: 1 } }
    );
  });

  it("500 on error", async () => {
    const req = { params: { id: 1 }, body: { newPassword: "abcdef" } };
    const res = mockRes();

    models.User.findByPk.mockRejectedValue(new Error("err"));

    await userController.setPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
