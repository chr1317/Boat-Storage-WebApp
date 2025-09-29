const express = require("express");
const { Op } = require("sequelize");
const { models, sequelize } = require("../Database/db");
const auth = require("../Middleware/Auth");

const router = express.Router();

// sprawdzenie konfliktu zakresów dat
async function hasOverlap(start, end, ignoreId = null, t) {
  const where = {
    [Op.and]: [
      { StartDate: { [Op.lte]: end } },
      { EndDate: { [Op.gte]: start } },
    ]
  };
  if (ignoreId) where.seasonID = { [Op.ne]: ignoreId };
  const cnt = await models.Seasons.count({ where, transaction: t });
  return cnt > 0;
}

// CREATE
router.post("/", auth(["Admin","Employee"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { year_start, year_end, StartDate, EndDate } = req.body;
    if (!year_start || !year_end || !StartDate || !EndDate) {
      await t.rollback(); return res.status(400).json({ error: "All fields are required" });
    }
    const s = new Date(StartDate), e = new Date(EndDate);
    if (Number.isNaN(s) || Number.isNaN(e) || e < s) {
      await t.rollback(); return res.status(400).json({ error: "Incorrect date range" });
    }

    if (await hasOverlap(s, e, null, t)) {
      await t.rollback(); return res.status(409).json({ error: "Conflict with existing season" });
    }

    const rec = await models.Seasons.create({ year_start, year_end, StartDate: s, EndDate: e }, { transaction: t });
    await t.commit();
    res.status(201).json(rec);
  } catch (e) {
    await t.rollback(); console.error(e);
    res.status(500).json({ error: "Error while creating season" });
  }
});

// LIST
router.get("/", auth(["Admin","Employee","Client"]), async (req, res) => {
  try {
    const seasons = await models.Seasons.findAll({ order: [["StartDate","ASC"]] });
    res.json(seasons);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error while listing seasons" });
  }
});

// GET ONE
router.get("/:id", auth(["Admin","Employee","Client"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id,10);
    const rec = await models.Seasons.findByPk(id);
    if (!rec) return res.status(404).json({ error: "Season not found" });
    res.json(rec);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error while getting season" });
  }
});

// UPDATE
router.put("/:id", auth(["Admin","Employee"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = parseInt(req.params.id,10);
    const rec = await models.Seasons.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!rec) { await t.rollback(); return res.status(404).json({ error: "Season not found" }); }

    const updates = {};
    if (req.body.year_start !== undefined) updates.year_start = req.body.year_start;
    if (req.body.year_end !== undefined) updates.year_end = req.body.year_end;

    if (req.body.StartDate !== undefined || req.body.EndDate !== undefined) {
      const s = req.body.StartDate ? new Date(req.body.StartDate) : new Date(rec.StartDate);
      const e = req.body.EndDate   ? new Date(req.body.EndDate)   : new Date(rec.EndDate);
      if (Number.isNaN(s) || Number.isNaN(e) || e < s) {
        await t.rollback(); return res.status(400).json({ error: "Incorrect date range" });
      }
      if (await hasOverlap(s, e, id, t)) {
        await t.rollback(); return res.status(409).json({ error: "Conflict with existing season" });
      }
      updates.StartDate = s; updates.EndDate = e;
    }

    await models.Seasons.update(updates, { where: { seasonID: id }, transaction: t });
    const refreshed = await models.Seasons.findByPk(id, { transaction: t });
    await t.commit();
    res.json(refreshed);
  } catch (e) {
    await t.rollback(); console.error(e);
    res.status(500).json({ error: "Error while updating season" });
  }
});

// DELETE (blokuj jeśli istnieją powiązane boat_storage)
router.delete("/:id", auth(["Admin","Employee"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = parseInt(req.params.id,10);

    const cnt = await models.BoatStorage.count({ where: { seasonID: id }, transaction: t });
    if (cnt > 0) {
      await t.rollback();
      return res.status(409).json({ error: "Season has boat storage entries and cannot be deleted" });
    }

    const rec = await models.Seasons.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!rec) { await t.rollback(); return res.status(404).json({ error: "Season not found" }); }

    await models.Seasons.destroy({ where: { seasonID: id }, transaction: t });
    await t.commit();
    res.json({ message: "Season deleted" });
  } catch (e) {
    await t.rollback(); console.error(e);
    res.status(500).json({ error: "Error while deleting season" });
  }
});

module.exports = router;
