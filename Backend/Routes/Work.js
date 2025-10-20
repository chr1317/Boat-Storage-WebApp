const express = require("express");
const { Op } = require("sequelize");
const { models, sequelize } = require("../Database/db");
const auth = require("../Middleware/Auth");

const router = express.Router();

const STATE_VALUES = ["ToDo", "InProgress", "Done"];
const WORK_FIELDS_ADMIN = [
  "SID",
  "BID",
  "seasonID",
  "Date",
  "HR",
  "Comment",
  "UID",
  "State",
  "parentWID" // 👈 dodane pole do hierarchii
];

/** CREATE: POST /work  (Admin/Employee)
 *  body: { SID, BID, seasonID, Date, HR?, Comment, UID?, State?, parentWID? }
 */
router.post("/", auth(["Admin", "Employee"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const payload = {};
    for (const k of WORK_FIELDS_ADMIN) {
      if (req.body[k] !== undefined) payload[k] = req.body[k];
    }

    const { BID, SID, seasonID, parentWID } = payload;

    // 🔒 Sprawdzenie FK
    const [boat, service, season] = await Promise.all([
      models.Boats.findByPk(BID, { transaction: t }),
      models.Services.findByPk(SID, { transaction: t }),
      models.Seasons.findByPk(seasonID, { transaction: t }),
    ]);
    if (!boat) throw new Error("Boat not found");
    if (!service) throw new Error("Service not found");
    if (!season) throw new Error("Season not found");

    if (payload.State && !STATE_VALUES.includes(payload.State)) {
      throw new Error("Invalid work state");
    }

    // 🔄 Walidacja podpracy
    if (parentWID) {
      const parent = await models.Work.findByPk(parentWID, { transaction: t });
      if (!parent) throw new Error("Parent work not found");
      if (parent.parentWID) throw new Error("Only one level of subtasks allowed");

      // ❌ Podprace nie mogą mieć HR ani UID
      payload.HR = null;
      payload.UID = null;
    }

    const rec = await models.Work.create(payload, { transaction: t });
    await t.commit();
    res.status(201).json(rec);
  } catch (e) {
    await t.rollback();
    console.error(e);
    res.status(500).json({ error: e.message || "Error while creating work" });
  }
});

/** GET /work (Admin/Employee) — wszystkie prace */
router.get("/", auth(["Admin", "Employee"]), async (req, res) => {
  try {
    const works = await models.Work.findAll({
      where: { parentWID: null }, // tylko główne prace
      order: [["WID", "ASC"]],
      include: [
        {
          model: models.Work,
          as: "subtasks",
          include: [{ model: models.Services }],
        },
        { model: models.Boats, include: [{ model: models.User, attributes: { exclude: ["Password"] } }] },
        { model: models.Services },
        { model: models.User, as: "User" },
        { model: models.Seasons },
      ],
    });

    res.json(works);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error while listing works" });
  }
});

/** GET /work/boat/:bid — prace danej łodzi */
router.get("/boat/:bid", auth(["Admin", "Employee", "Client"]), async (req, res) => {
  try {
    const { bid } = req.params;
    const boatId = parseInt(bid, 10);
    if (isNaN(boatId)) return res.status(400).json({ error: "Invalid boat id" });

    const boat = await models.Boats.findByPk(boatId, {
      include: [{ model: models.User }],
    });
    if (!boat) return res.status(404).json({ error: "Boat not found" });

    const isAdminOrEmployee = ["Admin", "Employee"].includes(req.user.role);
    if (!isAdminOrEmployee && boat.UID !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const works = await models.Work.findAll({
      where: { BID: boatId, parentWID: null },
      include: [
        { model: models.Work, as: "subtasks" },
        { model: models.Services },
        { model: models.User, as: "User" },
        { model: models.Seasons },
      ],
      order: [["WID", "ASC"]],
    });

    res.json(works);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error while listing boat works" });
  }
});

/** UPDATE STATE: PUT /work/:id/state (Admin/Employee) */
router.put("/:id/state", auth(["Admin", "Employee"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = parseInt(req.params.id, 10);
    const { State } = req.body;
    if (!STATE_VALUES.includes(State)) throw new Error("Invalid state");

    const rec = await models.Work.findByPk(id, { transaction: t });
    if (!rec) throw new Error("Work not found");

    rec.State = State;
    rec.Date = new Date(); // data zmiany stanu = data wykonania
    await rec.save({ transaction: t });

    // 🔹 jeśli to podpraca
    if (rec.parentWID) {
      // sprawdź wszystkie podprace
      const subtasks = await models.Work.findAll({
        where: { parentWID: rec.parentWID },
        transaction: t,
      });

      // czy wszystkie są Done
      const allDone = subtasks.every((s) => s.State === "Done");
      if (allDone) {
        // ustaw główną jako Done z najpóźniejszą datą
        const parent = await models.Work.findByPk(rec.parentWID, { transaction: t });
        if (parent) {
          const latestDate = subtasks.reduce(
            (latest, s) => (s.Date > latest ? s.Date : latest),
            subtasks[0].Date
          );
          parent.State = "Done";
          parent.Date = latestDate;
          await parent.save({ transaction: t });
        }
      }
    }

    // 🔹 jeśli to praca główna i oznaczona jako Done → ustaw datę
    if (!rec.parentWID && State === "Done") {
      rec.Date = new Date();
      await rec.save({ transaction: t });
    }

    await t.commit();
    res.json(rec);
  } catch (e) {
    await t.rollback();
    console.error(e);
    res.status(500).json({ error: e.message || "Error updating state" });
  }
});


/** UPDATE: PUT /work/:id (Admin/Employee) */
router.put("/:id", auth(["Admin", "Employee"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = parseInt(req.params.id, 10);
    const rec = await models.Work.findByPk(id, { transaction: t });
    if (!rec) throw new Error("Work not found");

    const updates = {};
    for (const k of WORK_FIELDS_ADMIN) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }

    if (updates.State && !STATE_VALUES.includes(updates.State))
      throw new Error("Invalid state");

    // ❌ Dla podpracy blokujemy HR i UID
    if (rec.parentWID) {
      delete updates.HR;
      delete updates.UID;
    }

    await rec.update(updates, { transaction: t });
    await t.commit();
    res.json(rec);
  } catch (e) {
    await t.rollback();
    console.error(e);
    res.status(500).json({ error: e.message || "Error updating work" });
  }
});

/** DELETE: DELETE /work/:id (Admin/Employee) */
router.delete("/:id", auth(["Admin", "Employee"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = parseInt(req.params.id, 10);
    const rec = await models.Work.findByPk(id, { transaction: t });
    if (!rec) throw new Error("Work not found");

    // 👇 jeśli usuwamy główną pracę, usuń też podprace
    if (!rec.parentWID) {
      await models.Work.destroy({ where: { parentWID: id }, transaction: t });
    }

    await rec.destroy({ transaction: t });
    await t.commit();
    res.json({ message: "Work deleted" });
  } catch (e) {
    await t.rollback();
    console.error(e);
    res.status(500).json({ error: e.message || "Error deleting work" });
  }
});

module.exports = router;
