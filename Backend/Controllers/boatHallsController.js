// Backend/controllers/boatHallsController.js
const { models, sequelize } = require("../Database/db");

const FIELDS = ["Length", "Width", "Height"];

function validateFields(body) {
  const out = {};
  for (const f of FIELDS) {
    if (body[f] === undefined) return { error: `Field ${f} is required` };

    if (!Number.isInteger(body[f]) || body[f] <= 0) {
      return { error: `${f} must be a positive integer` };
    }

    out[f] = body[f];
  }
  return { data: out };
}

function pickUpdates(body) {
  const out = {};
  for (const f of FIELDS) {
    if (body[f] !== undefined) {
      if (!Number.isInteger(body[f]) || body[f] <= 0) {
        return { error: `${f} must be a positive integer` };
      }
      out[f] = body[f];
    }
  }
  return { data: out };
}

module.exports = {
  /** CREATE */
  async create(req, res) {
    const t = await sequelize.transaction();
    try {
      const { error, data } = validateFields(req.body);
      if (error) {
        await t.rollback();
        return res.status(400).json({ error });
      }

      const hall = await models.Boathalls.create(data, { transaction: t });

      await t.commit();
      res.status(201).json(hall);
    } catch (e) {
      await t.rollback();
      console.error("Boathall create error:", e);
      res.status(500).json({ error: "Server error while creating boathall" });
    }
  },

  /** LIST */
  async list(_req, res) {
    try {
      const halls = await models.Boathalls.findAll({
        order: [["BHID", "ASC"]],
      });
      res.json(halls);
    } catch (e) {
      console.error("Boathall list error:", e);
      res.status(500).json({ error: "Server error while listing boathalls" });
    }
  },

  /** GET ONE */
  async getOne(req, res) {
    try {
      const id = parseInt(req.params.id, 10);

      const hall = await models.Boathalls.findByPk(id);
      if (!hall) {
        return res.status(404).json({ error: "Boathall not found" });
      }

      res.json(hall);
    } catch (e) {
      console.error("Boathall get error:", e);
      res.status(500).json({ error: "Server error while getting boathall" });
    }
  },

  /** UPDATE */
  async update(req, res) {
    const t = await sequelize.transaction();
    try {
      const id = parseInt(req.params.id, 10);

      const hall = await models.Boathalls.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!hall) {
        await t.rollback();
        return res.status(404).json({ error: "Boathall not found" });
      }

      const { data: updates, error } = pickUpdates(req.body);

      if (error) {
        await t.rollback();
        return res.status(400).json({ error });
      }

      if (!Object.keys(updates).length) {
        await t.rollback();
        return res.status(400).json({ error: "No valid fields to update" });
      }

      await models.Boathalls.update(updates, {
        where: { BHID: id },
        transaction: t,
      });

      const refreshed = await models.Boathalls.findByPk(id, {
        transaction: t,
      });

      await t.commit();
      res.json(refreshed);
    } catch (e) {
      await t.rollback();
      console.error("Boathall update error:", e);
      res.status(500).json({ error: "Server error while updating boathall" });
    }
  },

  /** DELETE */
  async remove(req, res) {
    const t = await sequelize.transaction();
    try {
      const id = parseInt(req.params.id, 10);

      const hall = await models.Boathalls.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!hall) {
        await t.rollback();
        return res.status(404).json({ error: "Boathall not found" });
      }

      const boats = await models.Boats.count({
        where: { BHID: id },
        transaction: t,
      });

      if (boats > 0) {
        await t.rollback();
        return res
          .status(409)
          .json({ error: "Boathall has assigned boats" });
      }

      await models.Boathalls.destroy({
        where: { BHID: id },
        transaction: t,
      });

      await t.commit();
      res.json({ message: "Boathall deleted" });
    } catch (e) {
      await t.rollback();
      console.error("Boathall delete error:", e);
      res.status(500).json({ error: "Server error while deleting boathall" });
    }
  },
};
