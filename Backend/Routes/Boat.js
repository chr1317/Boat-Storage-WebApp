const express = require("express");
const { Op } = require("sequelize");
const { models, sequelize } = require("../Database/db");
const auth = require("../Middleware/Auth");

const router = express.Router();

// Edytowalne pola
const BOAT_FIELDS_USER = ["name", "HIN", "Type", "Drive", "BHID", "QR"];
const BOAT_FIELDS_ADMIN = ["UID", ...BOAT_FIELDS_USER];

/** CREATE: POST /boats
 *  Client → tworzy dla siebie; Admin/Employee → może wskazać UID
 *  Transakcja: tworzenie łodzi
 */
router.post("/", auth(["Admin","Employee","Client"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const isAdmin = ["Admin","Employee"].includes(req.user.role);
    const payload = {};
    for (const k of isAdmin ? BOAT_FIELDS_ADMIN : BOAT_FIELDS_USER) {
      if (req.body[k] !== undefined) payload[k] = req.body[k];
    }
    payload.UID = isAdmin ? (payload.UID ?? req.user.id) : req.user.id;
    if (req.body.out !== undefined) payload.out = req.body.out; // opcjonalnie

    const boat = await models.Boats.create(payload, { transaction: t });
    await t.commit();
    res.status(201).json(boat);
  } catch (e) {
    await t.rollback();
    console.error(e);
    res.status(500).json({ error: "Server error while creating boat" });
  }
});

/** LIST: GET /boats
 *  Admin/Employee → wszystkie; Client → tylko swoje
 */
router.get("/", auth(["Admin","Employee","Client"]), async (req, res) => {
  try {
    const isAdmin = ["Admin","Employee"].includes(req.user.role);
    const where = isAdmin ? {} : { UID: req.user.id };

    const boats = await models.Boats.findAll({
      where,
      order: [["BID","ASC"]],
      include: [
        { model: models.Users, attributes: { exclude: ["Password"] } },
        { model: models.Boathalls },
        { model: models.BoatDimensions },
        { model: models.EngineInformation },
        { model: models.BoatPosition },
      ]
    });

    res.json(boats);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error while getting boats" });
  }
});

/** GET ONE: GET /boats/:id */
router.get("/:id", auth(["Admin","Employee","Client"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id,10);
    const isAdmin = ["Admin","Employee"].includes(req.user.role);

    const boat = await models.Boats.findByPk(id, {
      include: [
        { model: models.Users, attributes: { exclude: ["Password"] } },
        { model: models.Boathalls },
        { model: models.BoatDimensions },
        { model: models.EngineInformation },
        { model: models.BoatPosition },
      ]
    });
    if (!boat) return res.status(404).json({ error: "Boat not found" });
    if (!isAdmin && boat.UID !== req.user.id) {
      return res.status(403).json({ error: "No permission" });
    }
    res.json(boat);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error while getting boat" });
  }
});

/** UPDATE: PUT /boats/:id
 *  Transakcja na aktualizacji
 */
router.put("/:id", auth(["Admin","Employee","Client"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = parseInt(req.params.id,10);
    const isAdmin = ["Admin","Employee"].includes(req.user.role);

    const boat = await models.Boats.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!boat) { await t.rollback(); return res.status(404).json({ error: "Boat not found" }); }
    if (!isAdmin && boat.UID !== req.user.id) {
      await t.rollback(); return res.status(403).json({ error: "No permission" });
    }

    const updates = {};
    const allowed = isAdmin ? BOAT_FIELDS_ADMIN : BOAT_FIELDS_USER;
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    if (req.body.out !== undefined) updates.out = req.body.out;

    await models.Boats.update(updates, { where: { BID: id }, transaction: t });
    const refreshed = await models.Boats.findByPk(id, { transaction: t });
    await t.commit();
    res.json(refreshed);
  } catch (e) {
    await t.rollback();
    console.error(e);
    res.status(500).json({ error: "Server error while updating boat" });
  }
});

/** DELETE: DELETE /boats/:id
 *  Transakcja na usuwaniu (jeśli w DB masz CASCADE na FK, poleci spójnie)
 */
router.delete("/:id", auth(["Admin","Employee","Client"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = parseInt(req.params.id,10);
    const isAdmin = ["Admin","Employee"].includes(req.user.role);

    const boat = await models.Boats.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!boat) { await t.rollback(); return res.status(404).json({ error: "Boat not found" }); }
    if (!isAdmin && boat.UID !== req.user.id) {
      await t.rollback(); return res.status(403).json({ error: "No permission" });
    }

    await models.Boats.destroy({ where: { BID: id }, transaction: t });
    await t.commit();
    res.json({ message: "Boat deleted" });
  } catch (e) {
    await t.rollback();
    console.error(e);
    res.status(500).json({ error: "Server error while deleting boat" });
  }
});

/** SET OUT: PUT /boats/:id/out
 *  body: { out: "YYYY-MM-DDTHH:00:00.000Z" } lub null
 *  Transakcja + prosta kontrola konfliktów (slot godzinowy i limit dzienny)
 */
router.put("/:id/out", auth(["Admin","Employee","Client"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = parseInt(req.params.id,10);
    const { out } = req.body;
    const isAdmin = ["Admin","Employee"].includes(req.user.role);

    const boat = await models.Boats.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!boat) { await t.rollback(); return res.status(404).json({ error: "Boat not found" }); }
    if (!isAdmin && boat.UID !== req.user.id) {
      await t.rollback(); return res.status(403).json({ error: "No permission" });
    }

    if (out === null) {
      boat.out = null;
      await boat.save({ transaction: t });
      await t.commit();
      return res.json(boat);
    }

    // Normalizacja do pełnej godziny
    const slot = new Date(out);
    slot.setMinutes(0,0,0);

    // (opcjonalny) limit dzienny z .env
    const dayStart = new Date(slot); dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate()+1);
    const maxPerDay = parseInt(process.env.MAX_OUT_PER_DAY || "3", 10);

    const perDay = await models.Boats.count({
      where: { out: { [Op.gte]: dayStart, [Op.lt]: dayEnd }, BID: { [Op.ne]: boat.BID } },
      transaction: t, lock: t.LOCK.UPDATE
    });
    if (perDay >= maxPerDay) {
      await t.rollback();
      return res.status(409).json({ error: "Daily limit reached please choose another" });
    }

    // konflikt godzinowy (jeden slot = jedna łódź)
    const conflict = await models.Boats.count({
      where: { out: slot, BID: { [Op.ne]: boat.BID } },
      transaction: t, lock: t.LOCK.UPDATE
    });
    if (conflict) {
      await t.rollback();
      return res.status(409).json({ error: "Date taken please choose another" });
    }

    boat.out = slot;
    await boat.save({ transaction: t });
    await t.commit();
    res.json(boat);
  } catch (e) {
    await t.rollback();
    console.error(e);
    res.status(500).json({ error: "Server error while setting out" });
  }
});

module.exports = router;
