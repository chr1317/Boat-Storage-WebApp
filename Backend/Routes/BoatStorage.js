const express = require("express");
const { models, sequelize } = require("../Database/db");
const auth = require("../Middleware/Auth");

const router = express.Router();

/* CREATE (staff) — { BID, seasonID, IsComing?, ArrivalDate?, Budget? } */
router.post("/", auth(["Admin","Employee"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { BID, seasonID, IsComing = false, ArrivalDate = null, Budget = null } = req.body || {};
    if (!BID || !seasonID) { await t.rollback(); return res.status(400).json({ error: "BID and seasonID are required" }); }

    const boat = await models.Boats.findByPk(BID, { transaction: t });
    if (!boat) { await t.rollback(); return res.status(404).json({ error: "Boat not found" }); }
    const season = await models.Seasons.findByPk(seasonID, { transaction: t });
    if (!season) { await t.rollback(); return res.status(404).json({ error: "Season not found" }); }

    const exists = await models.BoatStorage.findOne({ where: { BID, seasonID }, transaction: t });
    if (exists) { await t.rollback(); return res.status(409).json({ error: "Storage entry for this boat and season already exists" }); }

    const budgetValue = (Budget === null || Budget === undefined) ? null :
      (Number.isInteger(Budget) && Budget >= 0 ? Budget : NaN);
    if (Number.isNaN(budgetValue)) { await t.rollback(); return res.status(400).json({ error: "Budget must be a non-negative integer or null" }); }

    const rec = await models.BoatStorage.create({
      BID,
      seasonID,
      IsComing: !!IsComing,
      ArrivalDate: ArrivalDate ? new Date(ArrivalDate) : null,
      Budget: budgetValue
    }, { transaction: t });

    await t.commit();
    res.status(201).json(rec);
  } catch {
    await t.rollback();
    res.status(500).json({ error: "Server error while creating storage entry" });
  }
});

/* LIST (staff) */
router.get("/", auth(["Admin","Employee"]), async (_req, res) => {
  try {
    const list = await models.BoatStorage.findAll({
      include: [{ model: models.Boats }, { model: models.Seasons }],
      order: [["AID", "ASC"]]
    });
    res.json(list);
  } catch {
    res.status(500).json({ error: "Server error while listing storage entries" });
  }
});

/* LIST mine (client) — wszystkie sezony dla jego łodzi */
router.get("/mine", auth(["Client","Admin","Employee"]), async (req, res) => {
  try {
    // staff widzi wszystko — dla spójności zwróćmy tak samo jak / (albo możesz ograniczyć)
    if (["Admin","Employee"].includes(req.user.role)) {
      const list = await models.BoatStorage.findAll({
        include: [{ model: models.Boats }, { model: models.Seasons }],
        order: [["AID", "ASC"]]
      });
      return res.json(list);
    }
    // client: tylko własne łodzie
    const list = await models.BoatStorage.findAll({
      include: [
        { model: models.Boats, where: { UID: req.user.id } },
        { model: models.Seasons }
      ],
      order: [["AID", "ASC"]]
    });
    res.json(list);
  } catch {
    res.status(500).json({ error: "Server error while listing your storage entries" });
  }
});

/* GET ONE (staff) */
router.get("/:id", auth(["Admin","Employee"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const rec = await models.BoatStorage.findByPk(id, {
      include: [{ model: models.Boats }, { model: models.Seasons }]
    });
    if (!rec) return res.status(404).json({ error: "Storage entry not found" });
    res.json(rec);
  } catch {
    res.status(500).json({ error: "Server error while getting storage entry" });
  }
});

/* UPDATE (staff) — { IsComing?, ArrivalDate?, Budget? } */
router.put("/:id", auth(["Admin","Employee"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = parseInt(req.params.id, 10);
    const rec = await models.BoatStorage.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!rec) { await t.rollback(); return res.status(404).json({ error: "Storage entry not found" }); }

    const updates = {};
    if (req.body.IsComing !== undefined) updates.IsComing = !!req.body.IsComing;
    if (req.body.ArrivalDate !== undefined) updates.ArrivalDate = req.body.ArrivalDate ? new Date(req.body.ArrivalDate) : null;
    if (req.body.Budget !== undefined) {
      if (req.body.Budget !== null && (!Number.isInteger(req.body.Budget) || req.body.Budget < 0)) {
        await t.rollback(); return res.status(400).json({ error: "Budget must be a non-negative integer (SEK) or null" });
      }
      updates.Budget = req.body.Budget === null ? null : req.body.Budget;
    }

    await models.BoatStorage.update(updates, { where: { AID: id }, transaction: t });
    const refreshed = await models.BoatStorage.findByPk(id, { transaction: t });
    await t.commit();
    res.json(refreshed);
  } catch {
    await t.rollback();
    res.status(500).json({ error: "Server error while updating storage entry" });
  }
});

/* DELETE (staff) */
router.delete("/:id", auth(["Admin","Employee"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = parseInt(req.params.id, 10);
    const rec = await models.BoatStorage.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!rec) { await t.rollback(); return res.status(404).json({ error: "Storage entry not found" }); }
    await models.BoatStorage.destroy({ where: { AID: id }, transaction: t });
    await t.commit();
    res.json({ message: "Storage entry deleted" });
  } catch {
    await t.rollback();
    res.status(500).json({ error: "Server error while deleting storage entry" });
  }
});

/* PATCH BUDGET
 * Client: can set if null or increase; cannot decrease
 * Staff : can set any non-negative value or null
 */
router.patch("/:id/budget", auth(["Admin","Employee","Client"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = parseInt(req.params.id, 10);
    const { Budget } = req.body;

    if (Budget !== null && (Budget === undefined || !Number.isInteger(Budget) || Budget < 0)) {
      await t.rollback(); return res.status(400).json({ error: "Budget must be a non-negative integer or null" });
    }

    const rec = await models.BoatStorage.findByPk(id, {
      include: [{ model: models.Boats }],
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (!rec) { await t.rollback(); return res.status(404).json({ error: "Storage entry not found" }); }

    const isStaff = ["Admin","Employee"].includes(req.user.role);
    const isOwner = rec.Boat && rec.Boat.UID === req.user.id;
    if (!isStaff && !isOwner) { await t.rollback(); return res.status(403).json({ error: "Forbidden" }); }

    // client monotonic rule: only set if null or increase
    if (!isStaff) {
      const current = rec.Budget; // may be null
      if (Budget === null) {
        await t.rollback(); return res.status(400).json({ error: "Client cannot clear budget" });
      }
      if (current !== null && Budget < current) {
        await t.rollback(); return res.status(400).json({ error: "Budget cannot be decreased by client" });
      }
      rec.Budget = Budget;
      await rec.save({ transaction: t });
      await t.commit();
      return res.json({ message: "Budget updated", AID: rec.AID, Budget: rec.Budget });
    }

    // staff: free to set (or clear)
    rec.Budget = Budget === null ? null : Budget;
    await rec.save({ transaction: t });
    await t.commit();
    res.json({ message: "Budget updated", AID: rec.AID, Budget: rec.Budget });
  } catch {
    await t.rollback();
    res.status(500).json({ error: "Server error while updating budget" });
  }
});

module.exports = router;
