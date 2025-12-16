// Backend/controllers/dimensionsController.js
const { models, sequelize } = require("../Database/db");

const ALLOWED_FIELDS = [
  "Length",
  "Width",
  "Height",
  "Deepness",
  "Weight",
  "U_Color",
  "Weight_we",
  "T_Color",
];

function pick(body) {
  const out = {};
  for (const k of ALLOWED_FIELDS) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
}

module.exports = {
  async create(req, res) {
    const t = await sequelize.transaction();
    try {
      const { BID } = req.body;
      if (!BID) {
        await t.rollback();
        return res.status(400).json({ error: "BID is required" });
      }

      const boat = await models.Boats.findByPk(BID, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!boat) {
        await t.rollback();
        return res.status(404).json({ error: "Boat not found" });
      }

      const isStaff = ["Admin", "Employee"].includes(req.user.role);
      if (!isStaff && boat.UID !== req.user.id) {
        await t.rollback();
        return res.status(403).json({ error: "Forbidden" });
      }

      const exists = await models.BoatDimensions.findOne({
        where: { BID },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (exists) {
        await t.rollback();
        return res
          .status(409)
          .json({ error: "Dimensions already exist for this boat" });
      }

      const payload = pick(req.body);
      payload.BID = BID;

      const dim = await models.BoatDimensions.create(payload, {
        transaction: t,
      });
      await t.commit();
      res.status(201).json(dim);
    } catch (e) {
      await t.rollback();
      console.error("Error creating dimensions:", e);
      res.status(500).json({ error: "Server error while creating dimensions" });
    }
  },

  async getByBid(req, res) {
    try {
      const bid = parseInt(req.params.bid, 10);
      const dim = await models.BoatDimensions.findOne({
        where: { BID: bid },
        include: [{ model: models.Boats }],
      });

      if (!dim) {
        return res.status(404).json({ error: "Dimensions not found" });
      }

      const isStaff = ["Admin", "Employee"].includes(req.user.role);
      if (!isStaff && dim.Boat.UID !== req.user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      res.json(dim);
    } catch (e) {
      console.error("Error fetching dimensions:", e);
      res.status(500).json({ error: "Server error while fetching dimensions" });
    }
  },

  async updateByBid(req, res) {
    const t = await sequelize.transaction();
    try {
      const bid = parseInt(req.params.bid, 10);

      const dim = await models.BoatDimensions.findOne({
        where: { BID: bid },
        include: [{ model: models.Boats }],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!dim) {
        await t.rollback();
        return res.status(404).json({ error: "Dimensions not found" });
      }

      const isStaff = ["Admin", "Employee"].includes(req.user.role);
      if (!isStaff && dim.Boat.UID !== req.user.id) {
        await t.rollback();
        return res.status(403).json({ error: "Forbidden" });
      }

      const updates = pick(req.body);
      await models.BoatDimensions.update(updates, {
        where: { BID: bid },
        transaction: t,
      });

      const refreshed = await models.BoatDimensions.findOne({
        where: { BID: bid },
        transaction: t,
      });

      await t.commit();
      res.json(refreshed);
    } catch (e) {
      await t.rollback();
      console.error("Error updating dimensions:", e);
      res.status(500).json({ error: "Server error while updating dimensions" });
    }
  },

  async deleteByBid(req, res) {
    const t = await sequelize.transaction();
    try {
      const bid = parseInt(req.params.bid, 10);

      const dim = await models.BoatDimensions.findOne({
        where: { BID: bid },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!dim) {
        await t.rollback();
        return res.status(404).json({ error: "Dimensions not found" });
      }

      await models.BoatDimensions.destroy({
        where: { BID: bid },
        transaction: t,
      });

      await t.commit();
      res.json({ message: "Dimensions deleted" });
    } catch (e) {
      await t.rollback();
      console.error("Error deleting dimensions:", e);
      res.status(500).json({ error: "Server error while deleting dimensions" });
    }
  },
};
