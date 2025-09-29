const express = require("express");
const { models, sequelize } = require("../Database/db");
const auth = require("../Middleware/Auth");

const router = express.Router();

router.post("/", auth(["Admin","Employee"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { Part, Name } = req.body;
    if (!Part || !Name) { await t.rollback(); return res.status(400).json({ error: "Part and Name are required" }); }

    const service = await models.Services.create({ Part, Name }, { transaction: t });
    await t.commit();
    res.status(201).json(service);
  } catch (e) {
    await t.rollback(); console.error(e);
    res.status(500).json({ error: "Error while creating service" });
  }
});

// LIST (wszyscy zalogowani mogą podejrzeć listę usług – opcjonalnie zawęź)
router.get("/", auth(["Admin","Employee","Client"]), async (req, res) => {
  try {
    const services = await models.Services.findAll({ order: [["SID","ASC"]] });
    res.json(services);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error while getting services" });
  }
});

// GET ONE
router.get("/:id", auth(["Admin","Employee","Client"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id,10);
    const service = await models.Services.findByPk(id);
    if (!service) return res.status(404).json({ error: "Service not found" });
    res.json(service);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error while getting service" });
  }
});

// UPDATE
router.put("/:id", auth(["Admin","Employee"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = parseInt(req.params.id,10);
    const rec = await models.Services.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!rec) { await t.rollback(); return res.status(404).json({ error: "Service not found" }); }

    const updates = {};
    if (req.body.Part !== undefined) updates.Part = req.body.Part;
    if (req.body.Name !== undefined) updates.Name = req.body.Name;

    await models.Services.update(updates, { where: { SID: id }, transaction: t });
    const refreshed = await models.Services.findByPk(id, { transaction: t });
    await t.commit();
    res.json(refreshed);
  } catch (e) {
    await t.rollback(); console.error(e);
    res.status(500).json({ error: "Error while updating service" });
  }
});

// DELETE
router.delete("/:id", auth(["Admin","Employee"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = parseInt(req.params.id,10);
    const rec = await models.Services.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!rec) { await t.rollback(); return res.status(404).json({ error: "Service not found" }); }

    await models.Services.destroy({ where: { SID: id }, transaction: t });
    await t.commit();
    res.json({ message: "Service deleted" });
  } catch (e) {
    await t.rollback(); console.error(e);
    res.status(500).json({ error: "Error while deleting service" });
  }
});

module.exports = router;
