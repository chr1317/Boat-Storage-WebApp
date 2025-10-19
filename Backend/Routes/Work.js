const express = require("express");
const { Op } = require("sequelize");
const { models, sequelize } = require("../Database/db");
const auth = require("../Middleware/Auth");

const router = express.Router();

const STATE_VALUES = ["ToDo", "InProgress", "Done"];
const WORK_FIELDS_ADMIN = ["SID", "BID", "seasonID", "Date", "HR", "Comment", "UID", "State"];

/** CREATE: POST /work  (Admin/Employee)
 *  body: { SID, BID, seasonID, Date, HR?, Comment, UID?, State? }
 */
router.post("/", auth(["Admin", "Employee"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const payload = {};
    for (const k of WORK_FIELDS_ADMIN) {
      if (req.body[k] !== undefined) payload[k] = req.body[k];
    }

    const { BID, SID, seasonID } = payload;

    // 🔒 sprawdzenie FK
    const [boat, service, season] = await Promise.all([
      models.Boats.findByPk(BID, { transaction: t }),
      models.Services.findByPk(SID, { transaction: t }),
      models.Seasons.findByPk(seasonID, { transaction: t }),
    ]);

    if (!boat) throw new Error("Boat not found");
    if (!service) throw new Error("Service not found");
    if (!season) throw new Error("Season not found");

    if (payload.State && !STATE_VALUES.includes(payload.State)) {
      throw new Error("Invalid order state");
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

/** GET /work (Admin/Employee)
 *  Zwraca wszystkie prace
 */
router.get("/", auth(["Admin", "Employee"]), async (req, res) => {
  try {
    const works = await models.Work.findAll({
      order: [["WID", "ASC"]],
      include: [
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

/** GET /work/boat/:bid
 *  Zwraca prace tylko dla danej łodzi
 *  - Admin/Employee → zawsze
 *  - Client → tylko jeśli łódź należy do niego
 */
router.get("/boat/:bid", auth(["Admin", "Employee", "Client"]), async (req, res) => {
  try {
    const { bid } = req.params;
    const boatId = parseInt(bid, 10);
    if (isNaN(boatId)) return res.status(400).json({ error: "Invalid boat id" });

    const boat = await models.Boats.findByPk(boatId, {
      include: [{ model: models.User }],
    });
    if (!boat) return res.status(404).json({ error: "Boat not found" });

    // 🔐 autoryzacja
    const isAdminOrEmployee = ["Admin", "Employee"].includes(req.user.role);
    if (!isAdminOrEmployee && boat.UID !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const works = await models.Work.findAll({
      where: { BID: boatId },
      include: [
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

/** UPDATE STATE: PUT /work/:id/state (Admin/Employee)
 *  body: { State }
 */
router.put("/:id/state", auth(["Admin", "Employee"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = parseInt(req.params.id, 10);
    const { State } = req.body;
    if (!STATE_VALUES.includes(State)) throw new Error("Invalid state");

    const rec = await models.Work.findByPk(id, { transaction: t });
    if (!rec) throw new Error("Work not found");

    rec.State = State;
    await rec.save({ transaction: t });

    await t.commit();
    res.json(rec);
  } catch (e) {
    await t.rollback();
    console.error(e);
    res.status(500).json({ error: e.message || "Error updating state" });
  }
});

/** UPDATE: PUT /work/:id (Admin/Employee)
 *  body: dowolny podzbiór WORK_FIELDS_ADMIN
 */
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
    if (updates.State && !STATE_VALUES.includes(updates.State)) throw new Error("Invalid state");

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
