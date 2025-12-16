const { models, sequelize } = require("../Database/db");

module.exports = {
  async create(req, res) {
    const t = await sequelize.transaction();
    try {
      const { Part, Name } = req.body;
      if (!Part || !Name) {
        await t.rollback();
        return res.status(400).json({ error: "Part and Name are required" });
      }

      const service = await models.Services.create({ Part, Name }, { transaction: t });
      await t.commit();
      res.status(201).json(service);

    } catch (e) {
      await t.rollback();
      console.error(e);
      res.status(500).json({ error: "Error while creating service" });
    }
  },

  async list(req, res) {
    try {
      const services = await models.Services.findAll({ order: [["SID","ASC"]] });
      res.json(services);

    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Error while getting services" });
    }
  },

  async getOne(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const service = await models.Services.findByPk(id);

      if (!service) return res.status(404).json({ error: "Service not found" });

      res.json(service);

    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Error while getting service" });
    }
  },

  async update(req, res) {
    const t = await sequelize.transaction();
    try {
      const id = parseInt(req.params.id, 10);

      const rec = await models.Services.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!rec) {
        await t.rollback();
        return res.status(404).json({ error: "Service not found" });
      }

      const updates = {};
      if (req.body.Part !== undefined) updates.Part = req.body.Part;
      if (req.body.Name !== undefined) updates.Name = req.body.Name;

      await models.Services.update(updates, { where: { SID: id }, transaction: t });

      const refreshed = await models.Services.findByPk(id, { transaction: t });

      await t.commit();
      res.json(refreshed);

    } catch (e) {
      await t.rollback();
      console.error(e);
      res.status(500).json({ error: "Error while updating service" });
    }
  },

  async delete(req, res) {
    const t = await sequelize.transaction();
    try {
      const id = parseInt(req.params.id, 10);

      const rec = await models.Services.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!rec) {
        await t.rollback();
        return res.status(404).json({ error: "Service not found" });
      }

      await models.Services.destroy({ where: { SID: id }, transaction: t });

      await t.commit();
      res.json({ message: "Service deleted" });

    } catch (e) {
      await t.rollback();
      console.error(e);
      res.status(500).json({ error: "Error while deleting service" });
    }
  }
};
