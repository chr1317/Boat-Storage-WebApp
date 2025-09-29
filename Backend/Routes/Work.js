// Backend/routes/work.js
const express = require("express");
const { Op } = require("sequelize");
const { models, sequelize } = require("../Database/db");
const auth = require("../Middleware/Auth");

const router = express.Router();

const STATE_VALUES = ["ToDo", "InProgress", "Done"];

// Admin może ustawić: SID, BID, seasonID, Date, HR, Comment, UID (przypisany pracownik), State
const WORK_FIELDS_ADMIN = ["SID","BID","seasonID","Date","HR","Comment","UID","State"];

/** CREATE: POST /work  (Admin/Employee)
 *  body: { SID, BID, seasonID, Date, HR?, Comment, UID? assign, State? }
 */
router.post("/", auth(["Admin", "Employee"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const payload = {};
    for (const k of WORK_FIELDS_ADMIN) {
      if (req.body[k] !== undefined) payload[k] = req.body[k];
    }

    // sprawdź FK istnienia
    const boat = await models.Boats.findByPk(payload.BID, { transaction: t });
    if (!boat) { await t.rollback(); return res.status(404).json({ error: "Boat not found" }); }

    const service = await models.Services.findByPk(payload.SID, { transaction: t });
    if (!service) { await t.rollback(); return res.status(404).json({ error: "Service not found" }); }

    const season = await models.Seasons.findByPk(payload.seasonID, { transaction: t });
    if (!season) { await t.rollback(); return res.status(404).json({ error: "Season not found" }); }

    if (payload.State && !STATE_VALUES.includes(payload.State)) {
      await t.rollback(); return res.status(400).json({ error: "Invalid order state" });
    }

    const rec = await models.Work.create(payload, { transaction: t });
    await t.commit();
    res.status(201).json(rec);
  } catch (e) {
    await t.rollback();
    console.error(e);
    res.status(500).json({ error: "Error while creating work" });
  }
});

/** LIST: GET /work
 *  Admin/Employee → wszystko; Client → tylko zlecenia swoich łodzi
 */
router.get("/", auth(["Admin","Employee","Client"]), async (req, res) => {
  try {
    const isAdmin = ["Admin","Employee"].includes(req.user.role);

    if (isAdmin) {
      const list = await models.Work.findAll({
        order: [["WID","ASC"]],
        include: [
          { model: models.Boats, include: [{ model: models.Users, attributes: { exclude: ["Password"] } }] },
          { model: models.Services },
          { model: models.User },   // przypisany pracownik (Users)
          { model: models.Seasons }
        ]
      });
      return res.json(list);
    }

    // Client → tylko Work, gdzie Boat.UID == req.user.id
    const list = await models.Work.findAll({
      include: [
        { model: models.Boats, where: { UID: req.user.id }, include: [{ model: models.Users, attributes: { exclude: ["Password"] } }] },
        { model: models.Services },
        { model: models.User },
        { model: models.Seasons }
      ],
      order: [["WID","ASC"]]
    });
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error while listing works" });
  }
});

/** UPDATE STATE: PUT /work/:id/state  (Admin/Employee)
 *  body: { State }
 */
router.put("/:id/state", auth(["Admin","Employee"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = parseInt(req.params.id, 10);
    const { State } = req.body;
    if (!STATE_VALUES.includes(State)) {
      await t.rollback(); return res.status(400).json({ error: "Incorrect order state" });
    }

    const rec = await models.Work.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!rec) { await t.rollback(); return res.status(404).json({ error: "Order not found" }); }

    rec.State = State;
    await rec.save({ transaction: t });

    await t.commit();
    res.json(rec);
  } catch (e) {
    await t.rollback();
    console.error(e);
    res.status(500).json({ error: "Server error while setting order state" });
  }
});

/** UPDATE: PUT /work/:id  (Admin/Employee)
 *  body: dowolny podzbiór WORK_FIELDS_ADMIN
 */
router.put("/:id", auth(["Admin","Employee"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = parseInt(req.params.id, 10);
    const rec = await models.Work.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!rec) { await t.rollback(); return res.status(404).json({ error: "Order not found" }); }

    const updates = {};
    for (const k of WORK_FIELDS_ADMIN) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    if (updates.State && !STATE_VALUES.includes(updates.State)) {
      await t.rollback(); return res.status(400).json({ error: "Incorrect order state" });
    }

    await models.Work.update(updates, { where: { WID: id }, transaction: t });
    const refreshed = await models.Work.findByPk(id, { transaction: t });
    await t.commit();
    res.json(refreshed);
  } catch (e) {
    await t.rollback();
    console.error(e);
    res.status(500).json({ error: "Server error while updating order" });
  }
});

/** DELETE: DELETE /work/:id  (Admin/Employee) */
router.delete("/:id", auth(["Admin","Employee"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = parseInt(req.params.id, 10);
    const rec = await models.Work.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!rec) { await t.rollback(); return res.status(404).json({ error: "Order not found" }); }

    await models.Work.destroy({ where: { WID: id }, transaction: t });
    await t.commit();
    res.json({ message: "Order deleted" });
  } catch (e) {
    await t.rollback();
    console.error(e);
    res.status(500).json({ error: "Server error while deleting order" });
  }
});

module.exports = router;
