// controllers/boatsController.js
const { Op } = require("sequelize");
const { models, sequelize } = require("../Database/db");
const uuidv4 = require("uuid").v4;


// EDITABLE FIELD LISTS
const BOAT_FIELDS_USER = ["name", "HIN", "Type", "Drive", "BHID"];
const BOAT_FIELDS = ["UID", ...BOAT_FIELDS_USER];
const DIM_FIELDS = [
  "Length","Width","Height","Deepness",
  "Weight","U_Color","Weight_we","T_Color"
];
const ENGINE_FIELDS = [
  "Model","Brand","Engine_nr","Reversing_gear","Reversing_gear_nr",
  "Sterndrive","Sterndrive_nr","Transom","Transom_nr",
  "BT","ST","Moto_H"
];

// Generate unique QR
async function generateUniqueQR() {
  while (true) {
    const qr = uuidv4();
    const exists = await models.Boats.findOne({ where: { QR: qr } });
    if (!exists) return qr;
  }
}

module.exports = {

  //------------------------------------
  // CREATE BOAT
  //------------------------------------
  async createBoat(req, res) {
    const t = await sequelize.transaction();
    try {
      const { boat: boatBody, dimensions: dimBody, engine: engBody } = req.body || {};

      if (!boatBody || !dimBody || engBody === undefined) {
        await t.rollback();
        return res.status(400).json({
          error: "Body must include boat, dimensions and engine objects"
        });
      }

      // BOAT VALIDATION
      const requiredBoat = ["name","HIN","Type","Drive"];
      const missingBoat = requiredBoat.filter(k =>
        boatBody[k] === undefined || boatBody[k] === null || boatBody[k] === ""
      );
      if (missingBoat.length) {
        await t.rollback();
        return res.status(400).json({
          error: `Missing boat fields: ${missingBoat.join(", ")}`
        });
      }

      // DIM VALIDATION
      const requiredDims = ["Length","Width"];
      const missingDims = requiredDims.filter(k =>
        dimBody[k] === undefined || dimBody[k] === null
      );
      if (missingDims.length) {
        await t.rollback();
        return res.status(400).json({
          error: `Missing dimensions fields: ${missingDims.join(", ")}`
        });
      }

      // CREATE BOAT
      const boatPayload = {};
      for (const k of BOAT_FIELDS) {
        if (boatBody[k] !== undefined) boatPayload[k] = boatBody[k];
      }
      boatPayload.UID = boatPayload.UID ?? req.user.id;
      boatPayload.QR = await generateUniqueQR();

      const boat = await models.Boats.create(boatPayload, { transaction: t });

      // CREATE DIMENSIONS
      const dimPayload = { BID: boat.BID };
      for (const k of DIM_FIELDS) dimPayload[k] = dimBody[k] ?? null;

      await models.BoatDimensions.create(dimPayload, { transaction: t });

      // CREATE ENGINE
      const eng = engBody || {};
      const engPayload = { BID: boat.BID };
      for (const k of ENGINE_FIELDS) engPayload[k] = eng[k] ?? null;

      await models.EngineInformation.create(engPayload, { transaction: t });

      await t.commit();
      res.status(201).json({
        message: "Boat created with dimensions and engine",
        BID: boat.BID
      });

    } catch (e) {
      await t.rollback();
      console.error(e);
      res.status(500).json({ error: "Server error while creating boat" });
    }
  },

  //------------------------------------
  // LIST BOATS
  //------------------------------------
  async listBoats(req, res) {
    try {
      const isAdmin = ["Admin","Employee"].includes(req.user.role);
      const where = isAdmin ? {} : { UID: req.user.id };

      const boats = await models.Boats.findAll({
        where,
        order: [["BID","ASC"]],
        include: [
          { model: models.User, attributes: { exclude: ["Password"] } },
          models.Boathalls,
          models.BoatDimensions,
          models.EngineInformation,
          models.BoatPosition
        ]
      });

      res.json(boats);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error while listing boats" });
    }
  },

  //------------------------------------
  // GET ONE BOAT
  //------------------------------------
  async getBoat(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const isAdmin = ["Admin","Employee"].includes(req.user.role);

      const boat = await models.Boats.findByPk(id, {
        include: [
          { model: models.User, attributes: { exclude: ["Password"] } },
          models.Boathalls,
          models.BoatDimensions,
          models.EngineInformation,
          models.BoatPosition,
        ]
      });

      if (!boat) return res.status(404).json({ error: "Boat not found" });
      if (!isAdmin && boat.UID !== req.user.id)
        return res.status(403).json({ error: "No permission" });

      res.json(boat);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error while fetching boat" });
    }
  },

  //------------------------------------
  // GET BOAT BY QR
  //------------------------------------
async getBoatByQR(req, res) {
  try {
    const { qr } = req.params;
    if (!qr) return res.status(400).json({ error: "Missing QR parameter" });

    const boat = await models.Boats.findOne({
      where: { QR: qr },
      include: [
        { model: models.User, attributes: { exclude: ["Password"] } },
        models.Boathalls,
        models.BoatDimensions,
        models.EngineInformation,
        models.BoatPosition,
      ]
    });

    if (!boat) return res.status(404).json({ error: "Boat not found" });

    const isStaff = ["Admin", "Employee"].includes(req.user.role);
    if (!isStaff && boat.UID !== req.user.id) {
      return res.status(403).json({ error: "No permission" });
    }

    // 🔹 SZUKAMY AKTUALNEGO STORAGE
    const now = new Date();

    const activeStorage = await models.BoatStorage.findOne({
      where: {
        BID: boat.BID
      },
      include: [
        {
          model: models.Seasons,
          where: {
            startDate: { [Op.lte]: now },
            endDate: { [Op.gte]: now }
          }
        }
      ]
    });

    res.json({
      boat,
      activeStorage: activeStorage || null
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error while fetching boat by QR" });
  }
},



async getBoatQRContext(req, res) {
  console.log("QR =", qr);
console.log("USER =", req.user);
console.log("ROLE =", req.user.role, req.user.Role);
console.log("ACTIVE STORAGE =", activeStorage?.AID);
  try {
    const { qr } = req.params;
    if (!qr) return res.status(400).json({ error: "Missing QR" });

    const boat = await models.Boats.findOne({
      where: { QR: qr },
    });

    if (!boat) return res.status(404).json({ error: "Boat not found" });

    const isStaff = ["Admin", "Employee"].includes(req.user.role);
    if (!isStaff && boat.UID !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const now = new Date();

    const activeStorage = await models.BoatStorage.findOne({
      where: { BID: boat.BID },
      include: [
        {
          model: models.Seasons,
          where: {
            startDate: { [Op.lte]: now },
            endDate: { [Op.gte]: now },
          },
        },
      ],
    });

    // 🔥 JEDNOZNACZNY KONTRAKT
    res.json({
      BID: boat.BID,
      AID: activeStorage ? activeStorage.AID : null,
    });
  } catch (e) {
    console.error("QR context error:", e);
    res.status(500).json({ error: "QR context error" });
  }
},


  //------------------------------------
  // UPDATE BOAT
  //------------------------------------
  async updateBoat(req, res) {
    const t = await sequelize.transaction();
    try {
      const id = parseInt(req.params.id,10);
      const isAdmin = ["Admin","Employee"].includes(req.user.role);

      const boat = await models.Boats.findByPk(id, {
        transaction: t, lock: t.LOCK.UPDATE
      });

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
  },

  //------------------------------------
  // DELETE BOAT
  //------------------------------------
  async deleteBoat(req, res) {
    const t = await sequelize.transaction();
    try {
      const id = parseInt(req.params.id,10);
      const isAdmin = ["Admin","Employee"].includes(req.user.role);

      const boat = await models.Boats.findByPk(id, {
        transaction: t, lock: t.LOCK.UPDATE
      });

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
  },

  //------------------------------------
  // SET OUT DATE
  //------------------------------------
  async setOut(req, res) {
    const t = await sequelize.transaction();
    try {
      const id = parseInt(req.params.id,10);
      const { out } = req.body;
      const isAdmin = ["Admin","Employee"].includes(req.user.role);

      const boat = await models.Boats.findByPk(id, {
        transaction: t, lock: t.LOCK.UPDATE
      });

      if (!boat) {
        await t.rollback();
        return res.status(404).json({ error: "Boat not found" });
      }
      if (!isAdmin && boat.UID !== req.user.id) {
        await t.rollback();
        return res.status(403).json({ error: "No permission" });
      }

      if (out === null) {
        boat.out = null;
        await boat.save({ transaction: t });
        await t.commit();
        return res.json(boat);
      }

      // normalize slot
      const slot = new Date(out);
      slot.setMinutes(0,0,0);

      // DAY LIMIT
      const dayStart = new Date(slot); dayStart.setHours(0,0,0,0);
      const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate()+1);

      const maxPerDay = parseInt(process.env.MAX_OUT_PER_DAY || "3", 10);

      const perDay = await models.Boats.count({
        where: {
          out: { [Op.gte]: dayStart, [Op.lt]: dayEnd },
          BID: { [Op.ne]: boat.BID }
        },
        transaction: t, lock: t.LOCK.UPDATE
      });

      if (perDay >= maxPerDay) {
        await t.rollback();
        return res.status(409).json({
          error: "Daily limit reached please choose another"
        });
      }

      // HOURLY SLOT CONFLICT
      const conflict = await models.Boats.count({
        where: { out: slot, BID: { [Op.ne]: boat.BID } },
        transaction: t, lock: t.LOCK.UPDATE
      });

      if (conflict) {
        await t.rollback();
        return res.status(409).json({
          error: "Date taken please choose another"
        });
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
  }
};
