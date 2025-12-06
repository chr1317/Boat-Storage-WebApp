// Backend/controllers/engineController.js
const { models, sequelize } = require("../Database/db");

const REQUIRED_FIELDS = [
  "Model",
  "Brand",
  "Engine_nr",
  "Reversing_gear",
  "Reversing_gear_nr",
  "Sterndrive",
  "Sterndrive_nr",
  "Transom",
  "Transom_nr",
  "BT",
  "ST",
  "Moto_H",
];

function pickEnginePayload(body) {
  const p = {};
  for (const k of REQUIRED_FIELDS) {
    if (body[k] !== undefined) p[k] = body[k];
  }
  return p;
}

module.exports = {
  /* POST /engine  — create engine info for a boat (one per BID) */
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

      const exists = await models.EngineInformation.findOne({
        where: { BID },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (exists) {
        await t.rollback();
        return res
          .status(409)
          .json({ error: "Engine information already exists for this boat" });
      }

      for (const f of REQUIRED_FIELDS) {
        if (
          req.body[f] === undefined ||
          req.body[f] === null ||
          req.body[f] === ""
        ) {
          await t.rollback();
          return res
            .status(400)
            .json({ error: `Field ${f} is required` });
        }
      }

      const payload = pickEnginePayload(req.body);
      payload.BID = BID;

      const engine = await models.EngineInformation.create(payload, {
        transaction: t,
      });

      await t.commit();
      res.status(201).json(engine);
    } catch (e) {
      await t.rollback();
      console.error(e);
      res.status(500).json({
        error: "Server error while creating engine information",
      });
    }
  },

  /* GET /engine/:bid — get engine info by boat id */
  async getByBoat(req, res) {
    try {
      const bid = parseInt(req.params.bid, 10);

      const engine = await models.EngineInformation.findOne({
        where: { BID: bid },
        include: [{ model: models.Boats }],
      });

      if (!engine) {
        return res
          .status(404)
          .json({ error: "Engine information not found" });
      }

      const isStaff = ["Admin", "Employee"].includes(req.user.role);
      if (!isStaff && engine.Boat.UID !== req.user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      res.json(engine);
    } catch (e) {
      console.error(e);
      res.status(500).json({
        error: "Server error while fetching engine information",
      });
    }
  },

  /* PUT /engine/:bid — update engine info by boat id */
  async update(req, res) {
    const t = await sequelize.transaction();
    try {
      const bid = parseInt(req.params.bid, 10);

      const engine = await models.EngineInformation.findOne({
        where: { BID: bid },
        include: [{ model: models.Boats }],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!engine) {
        await t.rollback();
        return res
          .status(404)
          .json({ error: "Engine information not found" });
      }

      const isStaff = ["Admin", "Employee"].includes(req.user.role);
      if (!isStaff && engine.Boat.UID !== req.user.id) {
        await t.rollback();
        return res.status(403).json({ error: "Forbidden" });
      }

      const updates = pickEnginePayload(req.body);

      // Optional: enforce required-once fields remain non-empty
      for (const f of REQUIRED_FIELDS) {
        if (updates[f] === "") {
          await t.rollback();
          return res.status(400).json({
            error: `Field ${f} cannot be empty`,
          });
        }
      }

      await models.EngineInformation.update(updates, {
        where: { BID: bid },
        transaction: t,
      });

      const refreshed = await models.EngineInformation.findOne({
        where: { BID: bid },
        transaction: t,
      });

      await t.commit();
      res.json(refreshed);
    } catch (e) {
      await t.rollback();
      console.error(e);
      res.status(500).json({
        error: "Server error while updating engine information",
      });
    }
  },

  /* DELETE /engine/:bid — staff only */
  async remove(req, res) {
    const t = await sequelize.transaction();
    try {
      const bid = parseInt(req.params.bid, 10);

      const engine = await models.EngineInformation.findOne({
        where: { BID: bid },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!engine) {
        await t.rollback();
        return res
          .status(404)
          .json({ error: "Engine information not found" });
      }

      await models.EngineInformation.destroy({
        where: { BID: bid },
        transaction: t,
      });

      await t.commit();
      res.json({ message: "Engine information deleted" });
    } catch (e) {
      await t.rollback();
      console.error(e);
      res.status(500).json({
        error: "Server error while deleting engine information",
      });
    }
  },
};
