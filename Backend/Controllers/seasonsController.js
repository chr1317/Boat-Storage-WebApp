const { models, sequelize } = require("../Database/db");
const { Op } = require("sequelize");

// check overlapping date ranges
async function hasOverlap(start, end, ignoreId = null, t) {
  const where = {
    [Op.and]: [
      { StartDate: { [Op.lte]: end } },
      { EndDate: { [Op.gte]: start } },
    ]
  };
  if (ignoreId) where.seasonID = { [Op.ne]: ignoreId };
  return await models.Seasons.count({ where, transaction: t }) > 0;
}

module.exports = {

  // -------------------------------------------------------------------
  // CREATE SEASON
  // -------------------------------------------------------------------
  async create(req, res) {
  const t = await sequelize.transaction();
  try {
    const { year_start, year_end } = req.body;

    // wymagane lata
    if (!Number.isInteger(year_start) || !Number.isInteger(year_end)) {
      await t.rollback();
      return res.status(400).json({ error: "year_start and year_end are required (integers)" });
    }

    // zawsze różnica 1 roku
    if (year_end !== year_start + 1) {
      await t.rollback();
      return res.status(400).json({ error: "year_end must be exactly year_start + 1" });
    }

    // stałe daty sezonu: 01.09 -> 31.08
    // UWAGA: używam UTC, żeby uniknąć jazdy z timezone (DST) w MySQL/JS
    const s = new Date(Date.UTC(year_start, 8, 1));   // Sep=8
    const e = new Date(Date.UTC(year_end, 7, 31));    // Aug=7

    // overlap check (zostaje jak masz)
    if (await hasOverlap(s, e, null, t)) {
      await t.rollback();
      return res.status(409).json({ error: "Conflict with existing season" });
    }

    // opcjonalnie: blokada duplikatu kombinacji lat (przed create)
    const exists = await models.Seasons.findOne({
      where: { year_start, year_end },
      transaction: t
    });
    if (exists) {
      await t.rollback();
      return res.status(409).json({ error: "Season with this year range already exists" });
    }

    const rec = await models.Seasons.create(
      {
        year_start,
        year_end,
        // dopasuj nazwy pól do modelu/tabeli:
        startDate: s,
        endDate: e
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(201).json(rec);
  } catch (e) {
    await t.rollback();
    console.error(e);
    return res.status(500).json({ error: "Error while creating season" });
  }
},


  // -------------------------------------------------------------------
  // LIST SEASONS
  // -------------------------------------------------------------------
  async list(_req, res) {
    try {
      const seasons = await models.Seasons.findAll({
        order: [["StartDate", "ASC"]],
      });
      res.json(seasons);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Error while listing seasons" });
    }
  },

  // -------------------------------------------------------------------
  // GET ONE
  // -------------------------------------------------------------------
  async getOne(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const rec = await models.Seasons.findByPk(id);
      if (!rec) return res.status(404).json({ error: "Season not found" });
      res.json(rec);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Error while getting season" });
    }
  },

  // -------------------------------------------------------------------
  // UPDATE
  // -------------------------------------------------------------------
  async update(req, res) {
    const t = await sequelize.transaction();
    try {
      const id = parseInt(req.params.id, 10);

      const rec = await models.Seasons.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!rec) {
        await t.rollback();
        return res.status(404).json({ error: "Season not found" });
      }

      const updates = {};

      if (req.body.year_start !== undefined) updates.year_start = req.body.year_start;
      if (req.body.year_end !== undefined) updates.year_end = req.body.year_end;

      if (req.body.StartDate !== undefined || req.body.EndDate !== undefined) {
        const s = req.body.StartDate ? new Date(req.body.StartDate) : new Date(rec.StartDate);
        const e = req.body.EndDate ? new Date(req.body.EndDate) : new Date(rec.EndDate);

        if (Number.isNaN(s) || Number.isNaN(e) || e < s) {
          await t.rollback();
          return res.status(400).json({ error: "Incorrect date range" });
        }

        if (await hasOverlap(s, e, id, t)) {
          await t.rollback();
          return res.status(409).json({ error: "Conflict with existing season" });
        }

        updates.StartDate = s;
        updates.EndDate = e;
      }

      await models.Seasons.update(updates, {
        where: { seasonID: id },
        transaction: t,
      });

      const refreshed = await models.Seasons.findByPk(id, { transaction: t });
      await t.commit();
      res.json(refreshed);

    } catch (e) {
      await t.rollback();
      console.error(e);
      res.status(500).json({ error: "Error while updating season" });
    }
  },

  // -------------------------------------------------------------------
  // DELETE (block if storage exists)
  // -------------------------------------------------------------------
  async delete(req, res) {
    const t = await sequelize.transaction();
    try {
      const id = parseInt(req.params.id, 10);

      // check linked boat_storage rows
      const cnt = await models.BoatStorage.count({
        where: { seasonID: id },
        transaction: t,
      });

      if (cnt > 0) {
        await t.rollback();
        return res.status(409).json({
          error: "Season has boat storage entries and cannot be deleted",
        });
      }

      const rec = await models.Seasons.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!rec) {
        await t.rollback();
        return res.status(404).json({ error: "Season not found" });
      }

      await models.Seasons.destroy({
        where: { seasonID: id },
        transaction: t,
      });

      await t.commit();
      res.json({ message: "Season deleted" });

    } catch (e) {
      await t.rollback();
      console.error(e);
      res.status(500).json({ error: "Error while deleting season" });
    }
  },
};
