const bcrypt = require("bcrypt");
const { models } = require("../Database/db");

const EDITABLE_FIELDS = [
  "Name", "Lastname", "City", "Street", "StreetNr",
  "PhoneNr", "Email", "PostNr"
];

module.exports = {

  // ======================================================
  // GET ME
  // ======================================================
  async getMe(req, res) {
    try {
      const me = await models.User.findByPk(req.user.id, {
        attributes: { exclude: ["Password"] }
      });
      if (!me) return res.status(404).json({ error: "Użytkownik nie znaleziony" });
      res.json(me);
    } catch (e) {
      res.status(500).json({ error: "Błąd serwera" });
    }
  },

  // ======================================================
  // LIST ALL (ADMIN)
  // ======================================================
  async list(req, res) {
    try {
      const users = await models.User.findAll({
        attributes: { exclude: ["Password"] },
        order: [["UID", "ASC"]]
      });
      res.json(users);
    } catch (e) {
      console.error("❌ [GET /users] error:", e);
      res.status(500).json({ error: "Błąd serwera" });
    }
  },

  // ======================================================
  // GET ONE
  // ======================================================
  async getOne(req, res) {
    try {
      const id = parseInt(req.params.id, 10);

      if (req.user.role !== "Admin" && req.user.id !== id)
        return res.status(403).json({ error: "Brak uprawnień" });

      const user = await models.User.findByPk(id, {
        attributes: { exclude: ["Password"] }
      });
      if (!user) return res.status(404).json({ error: "Użytkownik nie znaleziony" });

      res.json(user);
    } catch (e) {
      res.status(500).json({ error: "Błąd serwera" });
    }
  },

  // ======================================================
  // UPDATE ME
  // ======================================================
  async updateMe(req, res) {
    try {
      const updates = {};
      for (const key of EDITABLE_FIELDS)
        if (req.body[key] !== undefined) updates[key] = req.body[key];

      await models.User.update(updates, { where: { UID: req.user.id } });

      const refreshed = await models.User.findByPk(req.user.id, {
        attributes: { exclude: ["Password"] }
      });

      res.json(refreshed);
    } catch (e) {
      res.status(500).json({ error: "Błąd serwera" });
    }
  },

  // ======================================================
  // UPDATE ANY / SELF
  // ======================================================
  async update(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const isAdmin = req.user.role === "Admin";
      const isSelf = req.user.id === id;

      if (!isAdmin && !isSelf)
        return res.status(403).json({ error: "Brak uprawnień" });

      const updates = {};

      if (isAdmin) {
        const allowed = [...EDITABLE_FIELDS, "Role"];
        for (const key of allowed)
          if (req.body[key] !== undefined) updates[key] = req.body[key];
      } else {
        for (const key of EDITABLE_FIELDS)
          if (req.body[key] !== undefined) updates[key] = req.body[key];
      }

      const [count] = await models.User.update(updates, { where: { UID: id } });
      if (!count) return res.status(404).json({ error: "Użytkownik nie znaleziony" });

      const refreshed = await models.User.findByPk(id, {
        attributes: { exclude: ["Password"] }
      });

      res.json(refreshed);
    } catch (e) {
      res.status(500).json({ error: "Błąd serwera" });
    }
  },

  // ======================================================
  // UPDATE PASSWORD (admin or user with oldPassword)
  // ======================================================
  async updatePassword(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const { oldPassword, newPassword } = req.body;

      const isAdmin = req.user.role === "Admin";
      const isSelf = req.user.id === id;

      if (!isAdmin && !isSelf)
        return res.status(403).json({ error: "Brak uprawnień" });

      const user = await models.User.findByPk(id);
      if (!user) return res.status(404).json({ error: "Użytkownik nie znaleziony" });

      if (!isAdmin) {
        if (!oldPassword)
          return res.status(400).json({ error: "Wymagane stare hasło" });

        const ok = await bcrypt.compare(oldPassword, user.Password);
        if (!ok) return res.status(401).json({ error: "Stare hasło nieprawidłowe" });
      }

      if (!newPassword || String(newPassword).length < 6)
        return res.status(400).json({ error: "Nowe hasło musi mieć min. 6 znaków" });

      const hashed = await bcrypt.hash(newPassword, 10);

      await models.User.update({ Password: hashed }, { where: { UID: id } });

      res.json({ message: "Hasło zaktualizowane" });

    } catch (e) {
      res.status(500).json({ error: "Błąd serwera" });
    }
  },

  // ======================================================
  // DELETE USER (ADMIN)
  // ======================================================
  async delete(req, res) {
    try {
      const id = parseInt(req.params.id, 10);

      const count = await models.User.destroy({ where: { UID: id } });
      if (!count) return res.status(404).json({ error: "Użytkownik nie znaleziony" });

      res.json({ message: "Użytkownik usunięty" });

    } catch (e) {
      res.status(500).json({ error: "Błąd serwera" });
    }
  },

  // ======================================================
  // CREATE USER (ADMIN)
  // ======================================================
  async create(req, res) {
    try {
      const {
        Name, Lastname, City, Street, StreetNr,
        PhoneNr, Email, PostNr, Role
      } = req.body;

      const tempPassword = Math.random().toString(36).slice(-8);
      const hashed = await bcrypt.hash(tempPassword, 10);

      const newUser = await models.User.create({
        Name,
        Lastname,
        City,
        Street,
        StreetNr,
        PhoneNr,
        Email,
        PostNr,
        Role,
        Password: hashed,
        MustChangePassword: true,
      });

      const { Password, ...safeData } = newUser.toJSON();

      res.status(201).json({
        message: "Użytkownik utworzony. Tymczasowe hasło zostało wygenerowane.",
        tempPassword,
        user: safeData
      });

    } catch (e) {
      console.error("❌ [POST /user] error:", e);
      res.status(500).json({ error: "Błąd serwera" });
    }
  },

  // ======================================================
  // SET PASSWORD (AFTER TEMP PASSWORD)
  // ======================================================
  async setPassword(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6)
        return res.status(400).json({ error: "Password must have at least 6 characters" });

      const user = await models.User.findByPk(id);
      if (!user) return res.status(404).json({ error: "User not found" });

      const hashed = await bcrypt.hash(newPassword, 10);

      await models.User.update(
        { Password: hashed, MustChangePassword: false },
        { where: { UID: id } }
      );

      res.json({ message: "Password updated and flag cleared" });

    } catch (e) {
      console.error("[PUT /user/:id/set-password] error:", e);
      res.status(500).json({ error: "Server error while updating password" });
    }
  }

};
