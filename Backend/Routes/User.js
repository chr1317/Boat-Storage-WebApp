const express = require("express");
const bcrypt = require("bcrypt");
const { models } = require("../Database/db");
const auth = require("../Middleware/Auth");

const router = express.Router();

const EDITABLE_FIELDS = [
  "Name", "Lastname", "City", "Street", "StreetNr",
  "PhoneNr", "Email", "PostNr"
];

// GET /users/me  -> zalogowany user widzi siebie
router.get("/me", auth(), async (req, res) => {
  try {
    const me = await models.Users.findByPk(req.user.id, {
      attributes: { exclude: ["Password"] }
    });
    if (!me) return res.status(404).json({ error: "Użytkownik nie znaleziony" });
    res.json(me);
  } catch (e) {
    res.status(500).json({ error: "Błąd serwera" });
  }
});

// GET /users -> Admin: lista wszystkich
router.get("/", auth(["Admin"]), async (req, res) => {
  try {
    const users = await models.Users.findAll({
      attributes: { exclude: ["Password"] },
      order: [["UID", "ASC"]],
    });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: "Błąd serwera" });
  }
});

// GET /users/:id  -> Admin; user tylko gdy :id == jego id
router.get("/:id", auth(), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (req.user.role !== "Admin" && req.user.id !== id) {
      return res.status(403).json({ error: "Brak uprawnień" });
    }

    const user = await models.Users.findByPk(id, {
      attributes: { exclude: ["Password"] }
    });
    if (!user) return res.status(404).json({ error: "Użytkownik nie znaleziony" });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: "Błąd serwera" });
  }
});

// PUT /users/me   -> user edytuje siebie (bez roli)
router.put("/me", auth(), async (req, res) => {
  try {
    const updates = {};
    for (const key of EDITABLE_FIELDS) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    await models.Users.update(updates, { where: { UID: req.user.id } });

    const refreshed = await models.Users.findByPk(req.user.id, {
      attributes: { exclude: ["Password"] }
    });
    res.json(refreshed);
  } catch (e) {
    res.status(500).json({ error: "Błąd serwera" });
  }
});

// PUT /users/:id  -> Admin każdego; user tylko siebie (i bez zmiany roli)
router.put("/:id", auth(), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const isAdmin = req.user.role === "Admin";
    const isSelf = req.user.id === id;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: "Brak uprawnień" });
    }

    const updates = {};
    // Admin może zmienić wszystko (łącznie z Role), user tylko pola EDITABLE_FIELDS
    if (isAdmin) {
      const allowed = [...EDITABLE_FIELDS, "Role"];
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
    } else {
      for (const key of EDITABLE_FIELDS) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
    }

    const [count] = await models.Users.update(updates, { where: { UID: id } });
    if (!count) return res.status(404).json({ error: "Użytkownik nie znaleziony" });

    const refreshed = await models.Users.findByPk(id, {
      attributes: { exclude: ["Password"] }
    });
    res.json(refreshed);
  } catch (e) {
    res.status(500).json({ error: "Błąd serwera" });
  }
});

// PUT /users/:id/password  -> user: swoje hasło (wymaga oldPassword); Admin: dowolne (bez oldPassword)
router.put("/:id/password", auth(), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { oldPassword, newPassword } = req.body;
    const isAdmin = req.user.role === "Admin";
    const isSelf = req.user.id === id;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: "Brak uprawnień" });
    }

    const user = await models.Users.findByPk(id);
    if (!user) return res.status(404).json({ error: "Użytkownik nie znaleziony" });

    if (!isAdmin) {
      if (!oldPassword) return res.status(400).json({ error: "Wymagane stare hasło" });
      const ok = await bcrypt.compare(oldPassword, user.Password);
      if (!ok) return res.status(401).json({ error: "Stare hasło nieprawidłowe" });
    }

    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: "Nowe hasło musi mieć min. 6 znaków" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await models.Users.update({ Password: hashed }, { where: { UID: id } });

    res.json({ message: "Hasło zaktualizowane" });
  } catch (e) {
    res.status(500).json({ error: "Błąd serwera" });
  }
});

// DELETE /users/:id  -> tylko Admin
router.delete("/:id", auth(["Admin"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const count = await models.Users.destroy({ where: { UID: id } });
    if (!count) return res.status(404).json({ error: "Użytkownik nie znaleziony" });
    res.json({ message: "Użytkownik usunięty" });
  } catch (e) {
    res.status(500).json({ error: "Błąd serwera" });
  }
});

module.exports = router;
