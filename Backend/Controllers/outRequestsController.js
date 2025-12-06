const { models, sequelize } = require("../Database/db");
const { Op } = require("sequelize");

// minimalne okna czasowe
const MIN_DAYS_LAUNCH_WITH_WORKS = 21;
const MIN_DAYS_LAUNCH_NO_WORKS   = 7;
const MIN_DAYS_TRAILER           = 3;

const START_MONTH = parseInt(process.env.LAUNCH_START_MONTH || "4", 10);
const END_MONTH   = parseInt(process.env.LAUNCH_END_MONTH   || "9", 10);

// helpery
function daysBetween(startDate, targetDate) {
  const s = new Date(startDate); const t = new Date(targetDate);
  s.setHours(0,0,0,0); t.setHours(0,0,0,0);
  return Math.floor((t - s) / (1000 * 60 * 60 * 24));
}

async function resolveSeasonForBoat(BID, t) {
  const storage = await models.BoatStorage.findOne({
    where: { BID },
    order: [["seasonID","DESC"]],
    transaction: t,
  });
  return storage ? storage.seasonID : null;
}

async function hasWorksThisSeason(BID, seasonID, t) {
  if (!seasonID) return false;
  const count = await models.Work.count({ where: { BID, seasonID }, transaction: t });
  return count > 0;
}

module.exports = {

  // ----------------------------------------
  // POST /out-requests
  // ----------------------------------------
  async create(req, res) {
    const t = await sequelize.transaction();
    try {
      const { BID, type, preferredWeekStart, preferredWeekEnd, comment } = req.body || {};

      if (!BID || !type || !preferredWeekStart || !preferredWeekEnd) {
        await t.rollback();
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!["Launch","Trailer"].includes(type)) {
        await t.rollback();
        return res.status(400).json({ error: "Invalid type" });
      }

      const boat = await models.Boats.findByPk(BID, { transaction: t });
      if (!boat) {
        await t.rollback();
        return res.status(404).json({ error: "Boat not found" });
      }

      // Launch months restriction
      if (type === "Launch") {
        const month = new Date(preferredWeekStart).getUTCMonth() + 1;
        if (month < START_MONTH || month > END_MONTH) {
          await t.rollback();
          return res.status(400).json({
            error: "Launch is only allowed between April and September",
          });
        }
      }

      const isStaff = ["Admin","Employee"].includes(req.user.role);
      if (!isStaff && boat.UID !== req.user.id) {
        await t.rollback();
        return res.status(403).json({ error: "Forbidden" });
      }

      // season
      const seasonID = await resolveSeasonForBoat(BID, t);

      // only 1 pending request per boat+season
      const existingPending = await models.BoatOutRequest.findOne({
        where: { BID, seasonID, status: "Pending" },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (existingPending) {
        await t.rollback();
        return res.status(409).json({ error: "Pending request already exists for this boat" });
      }

      // minimal notice
      const today = new Date();
      const diffDays = daysBetween(today, preferredWeekStart);
      const works = await hasWorksThisSeason(BID, seasonID, t);

      let minDaysRequired;
      if (type === "Launch") {
        minDaysRequired = works ? MIN_DAYS_LAUNCH_WITH_WORKS : MIN_DAYS_LAUNCH_NO_WORKS;
      } else {
        minDaysRequired = MIN_DAYS_TRAILER;
      }

      if (diffDays < minDaysRequired) {
        await t.rollback();
        return res.status(400).json({
          error: `Too soon. Minimal lead time is ${minDaysRequired} days for this type of departure.`,
        });
      }

      const rec = await models.BoatOutRequest.create({
        BID,
        seasonID,
        requestedBy: req.user.id,
        type,
        preferredWeekStart,
        preferredWeekEnd,
        comment: comment || null,
        status: "Pending",
      }, { transaction: t });

      await t.commit();
      res.status(201).json(rec);

    } catch (e) {
      await t.rollback();
      console.error("Error creating out request:", e);
      res.status(500).json({ error: "Server error while creating out request" });
    }
  },

  // ----------------------------------------
  // GET /out-requests
  // ----------------------------------------
  async listAll(req, res) {
    try {
      const { status } = req.query;
      const where = {};

      if (status && ["Pending","Accepted","Rejected","Cancelled"].includes(status))
        where.status = status;

      const list = await models.BoatOutRequest.findAll({
        where,
        order: [["createdAt","DESC"]],
        include: [
          {
            model: models.Boats,
            include: [
              { model: models.User, attributes: ["UID","Name","PhoneNr","Email"] },
              { model: models.Boathalls },
            ],
          },
          { model: models.Seasons },
          { model: models.User, as: "Requester", attributes: ["UID","Name","Email"] },
          { model: models.User, as: "Handler", attributes: ["UID","Name","Email"] },
        ],
      });

      res.json(list);

    } catch (e) {
      console.error("Error listing out requests:", e);
      res.status(500).json({ error: "Server error while listing out requests" });
    }
  },

  // ----------------------------------------
  // GET /out-requests/my
  // ----------------------------------------
  async listMine(req, res) {
    try {
      const isClient = req.user.role === "Client";
      const where = {};

      if (isClient) where.requestedBy = req.user.id;

      const list = await models.BoatOutRequest.findAll({
        where,
        order: [["createdAt","DESC"]],
        include: [
          { model: models.Boats, include: [{ model: models.Boathalls }] },
          { model: models.Seasons },
        ],
      });

      res.json(list);

    } catch (e) {
      console.error("Error listing my out requests:", e);
      res.status(500).json({ error: "Server error while listing my out requests" });
    }
  },

  // ----------------------------------------
  // PUT /out-requests/:id/approve
  // ----------------------------------------
  async approve(req, res) {
    const t = await sequelize.transaction();
    try {
      const id = parseInt(req.params.id, 10);
      const { confirmedDate } = req.body || {};
      if (!confirmedDate) {
        await t.rollback();
        return res.status(400).json({ error: "confirmedDate is required" });
      }

      const reqRec = await models.BoatOutRequest.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
        include: [{ model: models.Boats }],
      });
      if (!reqRec) { await t.rollback(); return res.status(404).json({ error:"Request not found" }); }
      if (reqRec.status !== "Pending") {
        await t.rollback();
        return res.status(400).json({ error:"Only pending requests can be approved" });
      }

      const chosen = new Date(confirmedDate);
      const weekStart = new Date(reqRec.preferredWeekStart);
      const weekEnd = new Date(reqRec.preferredWeekEnd);

      if (chosen < weekStart || chosen > weekEnd) {
        await t.rollback();
        return res.status(400).json({ error: "Chosen date is outside requested week" });
      }

      // check daily limit
      const slot = new Date(chosen); slot.setMinutes(0,0,0);

      const dayStart = new Date(slot); dayStart.setHours(0,0,0,0);
      const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate()+1);
      const maxPerDay = parseInt(process.env.MAX_OUT_PER_DAY || "2", 10);

      const perDay = await models.Boats.count({
        where: {
          out: { [Op.gte]: dayStart, [Op.lt]: dayEnd },
          BID: { [Op.ne]: reqRec.BID },
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (perDay >= maxPerDay) {
        await t.rollback();
        return res.status(409).json({ error: "Daily limit reached, choose another day" });
      }

      // update boat.out
      const boat = await models.Boats.findByPk(reqRec.BID, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      boat.out = slot;
      await boat.save({ transaction: t });

      // update request
      reqRec.status = "Accepted";
      reqRec.confirmedDate = slot;
      reqRec.handledBy = req.user.id;
      await reqRec.save({ transaction: t });

      await t.commit();
      res.json(reqRec);

    } catch (e) {
      await t.rollback();
      console.error("Error approving request:", e);
      res.status(500).json({ error: "Server error while approving request" });
    }
  },

  // ----------------------------------------
  // PUT /out-requests/:id/reject
  // ----------------------------------------
  async reject(req, res) {
    const t = await sequelize.transaction();
    try {
      const id = parseInt(req.params.id, 10);
      const { reason } = req.body || {};

      const reqRec = await models.BoatOutRequest.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!reqRec) { await t.rollback(); return res.status(404).json({ error:"Request not found" }); }
      if (reqRec.status !== "Pending") {
        await t.rollback();
        return res.status(400).json({ error:"Only pending requests can be rejected" });
      }

      reqRec.status = "Rejected";
      reqRec.rejectReason = reason || null;
      reqRec.handledBy = req.user.id;
      await reqRec.save({ transaction: t });

      await t.commit();
      res.json(reqRec);

    } catch (e) {
      await t.rollback();
      console.error("Error rejecting request:", e);
      res.status(500).json({ error:"Server error while rejecting request" });
    }
  },

  // ----------------------------------------
  // PUT /out-requests/:id/cancel
  // ----------------------------------------
  async cancel(req, res) {
    const t = await sequelize.transaction();
    try {
      const id = parseInt(req.params.id, 10);

      const reqRec = await models.BoatOutRequest.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!reqRec) { await t.rollback(); return res.status(404).json({ error:"Request not found" }); }
      if (reqRec.status !== "Pending") {
        await t.rollback();
        return res.status(400).json({ error:"Only pending requests can be cancelled" });
      }

      const isStaff = ["Admin","Employee"].includes(req.user.role);
      if (!isStaff && reqRec.requestedBy !== req.user.id) {
        await t.rollback();
        return res.status(403).json({ error:"Forbidden" });
      }

      reqRec.status = "Cancelled";
      await reqRec.save({ transaction: t });

      await t.commit();
      res.json(reqRec);

    } catch (e) {
      await t.rollback();
      console.error("Error cancelling request:", e);
      res.status(500).json({ error:"Server error while cancelling request" });
    }
  },
};
