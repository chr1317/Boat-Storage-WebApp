const { models, sequelize } = require("../Database/db");
const { Op } = require("sequelize");

// minimalne okna czasowe
const MIN_DAYS_LAUNCH_WITH_WORKS = 21;
const MIN_DAYS_LAUNCH_NO_WORKS   = 7;
const MIN_DAYS_TRAILER           = 3;

const START_MONTH = parseInt(process.env.LAUNCH_START_MONTH || "4", 10);
const END_MONTH   = parseInt(process.env.LAUNCH_END_MONTH   || "9", 10);

function daysBetween(startDate, targetDate) {
  const s = new Date(startDate); const t = new Date(targetDate);
  s.setHours(0,0,0,0); t.setHours(0,0,0,0);
  return Math.floor((t - s) / (1000 * 60 * 60 * 24));
}

async function resolveStorageContext(AID, t) {
  if (!AID) return null;

  const storage = await models.BoatStorage.findByPk(AID, {
    transaction: t,
  });
  if (!storage) return null;

  return {
    BID: storage.BID,
    seasonID: storage.seasonID,
    AID: storage.AID,
  };
}

async function hasWorksThisSeason(BID, seasonID, t, AID = null) {
  if (!seasonID) return false;
  const where = { BID, seasonID };
  if (AID) where.AID = AID;
  const count = await models.Work.count({ where, transaction: t });
  return count > 0;
}



module.exports = {
async create(req, res) {
  const t = await sequelize.transaction();
  try {
    const {
      AID,
      type,
      preferredWeekStart,
      preferredWeekEnd,
      comment,
    } = req.body || {};

    if (!AID || !type || !preferredWeekStart || !preferredWeekEnd) {
      await t.rollback();
      return res.status(400).json({
        error: "AID, type and preferred week are required",
      });
    }

    if (!["Launch", "Trailer"].includes(type)) {
      await t.rollback();
      return res.status(400).json({ error: "Invalid type" });
    }

    const ctx = await resolveStorageContext(AID, t);
    if (!ctx) {
      await t.rollback();
      return res.status(400).json({
        error: "BoatStorage (AID) not found for this request",
      });
    }

    const { BID, seasonID } = ctx;

    const boat = await models.Boats.findByPk(BID, { transaction: t });
    if (!boat) {
      await t.rollback();
      return res.status(404).json({ error: "Boat not found" });
    }

    if (type === "Launch") {
      const month = new Date(preferredWeekStart).getUTCMonth() + 1;
      if (month < START_MONTH || month > END_MONTH) {
        await t.rollback();
        return res.status(400).json({
          error: `Launch allowed only between months ${START_MONTH}-${END_MONTH}`,
        });
      }
    }

    const existingPending = await models.BoatOutRequest.findOne({
      where: { BID, seasonID, status: "Pending" },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (existingPending) {
      await t.rollback();
      return res.status(409).json({
        error:
          "Pending request already exists for this boat and season",
      });
    }

    const today = new Date();
    const diffDays = daysBetween(today, preferredWeekStart);
    const works = await hasWorksThisSeason(BID, seasonID, t, AID);

    let minDaysRequired;
    if (type === "Launch") {
      minDaysRequired = works
        ? MIN_DAYS_LAUNCH_WITH_WORKS
        : MIN_DAYS_LAUNCH_NO_WORKS;
    } else {
      minDaysRequired = MIN_DAYS_TRAILER;
    }

    if (diffDays < minDaysRequired) {
      await t.rollback();
      return res.status(400).json({
        error: `Too soon. Minimal lead time is ${minDaysRequired} days for this type of departure.`,
      });
    }

    const rec = await models.BoatOutRequest.create(
      {
        BID,
        AID,
        seasonID,
        requestedBy: req.user.id,
        type,
        preferredWeekStart,
        preferredWeekEnd,
        comment: comment || null,
        status: "Pending",
      },
      { transaction: t }
    );

    await t.commit();
    res.status(201).json(rec);
  } catch (e) {
    await t.rollback();
    console.error("Error creating out request:", e);
    res.status(500).json({
      error: "Server error while creating out request",
    });
  }
},
  async listAll(req, res) {
  try {
    const { status, AID } = req.query;
    const where = {};

    if (
      status &&
      ["Pending", "Accepted", "Rejected", "Cancelled"].includes(status)
    ) {
      where.status = status;
    }

    if (AID) {
      const aid = parseInt(AID, 10);
      if (Number.isNaN(aid)) {
        return res.status(400).json({ error: "Invalid AID" });
      }
      where.AID = aid;
    }

    const list = await models.BoatOutRequest.findAll({
      where,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: models.Boats,
          include: [
            {
              model: models.User,
              attributes: ["UID", "Name", "PhoneNr", "Email"],
            },
            { model: models.Boathalls },
          ],
        },
        { model: models.Seasons },
        {
          model: models.User,
          as: "Requester",
          attributes: ["UID", "Name", "Email"],
        },
        {
          model: models.User,
          as: "Handler",
          attributes: ["UID", "Name", "Email"],
        },
      ],
    });

    res.json(list);
  } catch (e) {
    console.error("Error listing out requests:", e);
    res.status(500).json({
      error: "Server error while listing out requests",
    });
  }
},

  async listMine(req, res) {
  try {
    const isClient = req.user.role === "Client";
    const { AID } = req.query;
    const where = {};

    if (isClient) {
      where.requestedBy = req.user.id;
    }

    if (AID) {
      const aid = parseInt(AID, 10);
      if (Number.isNaN(aid)) {
        return res.status(400).json({ error: "Invalid AID" });
      }
      where.AID = aid;
    }

    const list = await models.BoatOutRequest.findAll({
      where,
      order: [["createdAt", "DESC"]],
      include: [
        { model: models.Boats, include: [{ model: models.Boathalls }] },
        { model: models.Seasons },
      ],
    });

    res.json(list);
  } catch (e) {
    console.error("Error listing my out requests:", e);
    res.status(500).json({
      error: "Server error while listing my out requests",
    });
  }
},

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

      const boat = await models.Boats.findByPk(reqRec.BID, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      boat.out = slot;
      await boat.save({ transaction: t });

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
