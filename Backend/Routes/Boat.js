const express = require("express");
const { Op } = require("sequelize");
const { models, sequelize } = require("../Database/db");
const auth = require("../Middleware/Auth");

const router = express.Router();

// Edytowalne pola
const BOAT_FIELDS_USER = ["name", "HIN", "Type", "Drive", "BHID", "QR"];
const BOAT_FIELDS = ["UID", ...BOAT_FIELDS_USER];
const DIM_FIELDS  = ["Length","Width","Height","Deepness","Weight","U_Color","Weight_we","T_Color"];
const ENGINE_FIELDS = [
  "Model","Brand","Engine_nr","Reversing_gear","Reversing_gear_nr",
  "Sterndrive","Sterndrive_nr","Transom","Transom_nr","BT","ST","Moto_H"
];

/** CREATE: POST /boats
 *  Client → tworzy dla siebie; Admin/Employee → może wskazać UID
 *  Transakcja: tworzenie łodzi
 */
router.post("/", auth(["Admin","Employee"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { boat: boatBody, dimensions: dimBody, engine: engBody } = req.body || {};

    // Basic presence checks
    if (!boatBody || !dimBody || !engBody) {
      await t.rollback();
      return res.status(400).json({ error: "Body must include boat, dimensions and engine objects" });
    }

    // Minimal validations
    const requiredBoat = ["name","HIN","Type","BHID","Drive","QR"];
    const missingBoat = requiredBoat.filter(k => boatBody[k] === undefined || boatBody[k] === null);
    if (missingBoat.length) {
      await t.rollback();
      return res.status(400).json({ error: `Missing boat fields: ${missingBoat.join(", ")}` });
    }

    const requiredDims = ["Length","Width"]; // reszta opcjonalnie
    const missingDims = requiredDims.filter(k => dimBody[k] === undefined || dimBody[k] === null);
    if (missingDims.length) {
      await t.rollback();
      return res.status(400).json({ error: `Missing dimensions fields: ${missingDims.join(", ")}` });
    }

    const requiredEngine = ["Model","Brand","Engine_nr","Reversing_gear","Reversing_gear_nr","Sterndrive","Sterndrive_nr","Transom","Transom_nr","BT","ST","Moto_H"];
    const missingEngine = requiredEngine.filter(k => engBody[k] === undefined || engBody[k] === null);
    if (missingEngine.length) {
      await t.rollback();
      return res.status(400).json({ error: `Missing engine fields: ${missingEngine.join(", ")}` });
    }

    // Build payloads (whitelisting)
    const boatPayload = {};
    for (const k of BOAT_FIELDS) if (boatBody[k] !== undefined) boatPayload[k] = boatBody[k];
    // UID default = creator
    boatPayload.UID = boatPayload.UID ?? req.user.id;

    // Create Boat
    const boat = await models.Boats.create(boatPayload, { transaction: t });

    // Create Dimensions
    const dimPayload = { BID: boat.BID };
    for (const k of DIM_FIELDS) if (dimBody[k] !== undefined) dimPayload[k] = dimBody[k];
    await models.BoatDimensions.create(dimPayload, { transaction: t });

    // Create Engine
    const engPayload = { BID: boat.BID };
    for (const k of ENGINE_FIELDS) if (engBody[k] !== undefined) engPayload[k] = engBody[k];
    await models.EngineInformation.create(engPayload, { transaction: t });

    await t.commit();
    res.status(201).json({ message: "Boat created with dimensions and engine", BID: boat.BID });
  } catch (e) {
    await t.rollback();
    console.error(e);
    res.status(500).json({ error: "Server error while creating boat with details" });
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
    const allowed = isAdmin ? BOAT_FIELDS : BOAT_FIELDS_USER;
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
