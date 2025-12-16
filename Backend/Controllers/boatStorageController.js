const { models, sequelize } = require("../Database/db");
const { QueryTypes } = require("sequelize");


module.exports = {
  async create(req, res) {
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
    } catch (err) {
      await t.rollback();
      res.status(500).json({ error: "Server error while creating storage entry" });
    }
  },

  async list(req, res) {
    try {
      const list = await models.BoatStorage.findAll({
        include: [{ model: models.Boats }, { model: models.Seasons }],
        order: [["AID", "ASC"]]
      });
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: "Server error while listing storage entries" });
    }
  },

  async listLight(req, res) {
  try {
    const rows = await sequelize.query(
      `
      SELECT
        bs.AID,
        bs.ArrivalDate,
        bs.Budget,

        b.BID,
        b.name        AS boatName,
        b.HIN         AS boatHIN,

        u.UID,
        u.Name        AS ownerName,

        s.seasonID,
        s.startDate,
        s.endDate,
        s.year_start,
        s.year_end

      FROM boat_storage bs
      JOIN boats b      ON b.BID = bs.BID
      JOIN users u      ON u.UID = b.UID
      JOIN seasons s    ON s.seasonID = bs.seasonID

      ORDER BY bs.AID ASC
      `,
      { type: QueryTypes.SELECT }
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while listing storage entries (light)" });
  }
},



async byBoat(req, res) {
  try {
    const BID = parseInt(req.params.bid, 10);
    if (!BID) {
      return res.status(400).json({ error: "Invalid BID" });
    }

    const isStaff = ["Admin", "Employee"].includes(req.user.role);

    if (!isStaff) {
      const boat = await models.Boats.findOne({
        where: {
          BID,
          UID: req.user.id
        }
      });

      if (!boat) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const list = await models.BoatStorage.findAll({
      where: { BID },
      include: [
        { model: models.Boats },
        { model: models.Seasons }
      ],
      order: [["AID", "ASC"]]
    });

    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while getting boat storage list" });
  }
},



  async mine(req, res) {
    try {
      if (["Admin", "Employee"].includes(req.user.role)) {
        const list = await models.BoatStorage.findAll({
          include: [{ model: models.Boats }, { model: models.Seasons }],
          order: [["AID", "ASC"]]
        });
        return res.json(list);
      }

      const list = await models.BoatStorage.findAll({
        include: [
          { model: models.Boats, where: { UID: req.user.id } },
          { model: models.Seasons }
        ],
        order: [["AID", "ASC"]]
      });

      res.json(list);
    } catch (err) {
      res.status(500).json({ error: "Server error while listing your storage entries" });
    }
  },

async getOne(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid AID" });
    }

    const rec = await models.BoatStorage.findByPk(id, {
      include: [
        {
          model: models.Boats,
        },
        {
          model: models.Seasons,
        }
      ]
    });

    if (!rec) {
      return res.status(404).json({ error: "Storage entry not found" });
    }

    const isStaff = ["Admin", "Employee"].includes(req.user.role);

    if (!isStaff && rec.Boat.UID !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(rec);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while getting storage entry" });
  }
},


  async update(req, res) {
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
  },

  async delete(req, res) {
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
  },

  async updateBudget(req, res) {
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

      if (!isStaff && !isOwner) {
        await t.rollback();
        return res.status(403).json({ error: "Forbidden" });
      }

      if (!isStaff) {
        const current = rec.Budget;

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

      rec.Budget = Budget === null ? null : Budget;
      await rec.save({ transaction: t });
      await t.commit();

      res.json({ message: "Budget updated", AID: rec.AID, Budget: rec.Budget });
    } catch {
      await t.rollback();
      res.status(500).json({ error: "Server error while updating budget" });
    }
  },
};
