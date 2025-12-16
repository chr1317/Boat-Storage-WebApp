const { Op } = require("sequelize");
const { models, sequelize } = require("../Database/db");
const { updateProblemStatusIfNeeded } = require("./updateProblemStatus");

const STATE_VALUES = ["ToDo", "InProgress", "Done"];
const WORK_FIELDS_ADMIN = [
  "SID",
  "BID",
  "AID",
  "seasonID",
  "Date",
  "HR",
  "Comment",
  "UID",
  "State",
  "parentWID",
];

async function recalcParentState(parentWID, t) {
  const subtasks = await models.Work.findAll({
    where: { parentWID },
    transaction: t,
  });

  if (!subtasks.length) return;

  const parent = await models.Work.findByPk(parentWID, { transaction: t });
  if (!parent) return;

  const allDone = subtasks.every(s => s.State === "Done");
  const allTodo = subtasks.every(s => s.State === "ToDo");
  const anyInProgress = subtasks.some(s => s.State === "InProgress");

  if (anyInProgress) parent.State = "InProgress";
  else if (allTodo) parent.State = "ToDo";
  else if (allDone) {
    parent.State = "Done";

    let latest = null;
    for (const s of subtasks) {
      if (!s.Date) continue;
      const d = new Date(s.Date);
      if (!latest || d > latest) latest = d;
    }
    parent.Date = latest || new Date();
  } else {
    parent.State = "InProgress";
  }

  await parent.save({ transaction: t });
  await updateProblemStatusIfNeeded(parent, t);
}


module.exports = {
  async create(req, res) {
  const t = await sequelize.transaction();
  try {
    const payload = {};
    for (const k of WORK_FIELDS_ADMIN) {
      if (req.body[k] !== undefined) payload[k] = req.body[k];
    }

    const { AID, SID, parentWID } = payload;

    if (!AID) {
      await t.rollback();
      return res
        .status(400)
        .json({
          error:
            "AID is required. Create work always for a specific BoatStorage record.",
        });
    }

    const storage = await models.BoatStorage.findByPk(AID, {
      transaction: t,
    });
    if (!storage) {
      await t.rollback();
      return res
        .status(400)
        .json({ error: "BoatStorage (AID) not found" });
    }

    payload.BID = storage.BID;
    payload.seasonID = storage.seasonID;

    const [boat, service, season] = await Promise.all([
      models.Boats.findByPk(payload.BID, { transaction: t }),
      models.Services.findByPk(SID, { transaction: t }),
      models.Seasons.findByPk(payload.seasonID, { transaction: t }),
    ]);

    if (!boat) throw new Error("Boat not found");
    if (!service) throw new Error("Service not found");
    if (!season) throw new Error("Season not found");

    if (payload.State && !STATE_VALUES.includes(payload.State)) {
      throw new Error("Invalid work state");
    }

    if (parentWID) {
      const parent = await models.Work.findByPk(parentWID, {
        transaction: t,
      });
      if (!parent) throw new Error("Parent work not found");
      if (parent.parentWID)
        throw new Error("Only one level of subtasks allowed");

      payload.HR = null;
      payload.UID = null;
    }

    const rec = await models.Work.create(payload, { transaction: t });
    await t.commit();
    res.status(201).json(rec);
  } catch (e) {
    await t.rollback();
    res
      .status(500)
      .json({ error: e.message || "Error creating work" });
  }
},

async listAll(req, res) {
  try {
    const works = await models.Work.findAll({
      where: { parentWID: null },
      order: [["WID", "ASC"]],
      include: [
        { model: models.Services },
        { model: models.User, as: "User" },
        { model: models.Boats },
        { model: models.Seasons },
      ],
    });

    res.json(works);
  } catch (e) {
    res.status(500).json({ error: "Server error listing works" });
  }
},

async listByStorage(req, res) {
  console.log("REQ.USER =", req.user);
  try {
    const AID = parseInt(req.params.aid, 10);
    if (Number.isNaN(AID)) {
      return res.status(400).json({ error: "Invalid AID" });
    }

    const storage = await models.BoatStorage.findByPk(AID, {
      include: [{ model: models.Boats }],
    });

    if (!storage) {
      return res.status(404).json({ error: "BoatStorage not found" });
    }

    const isStaff = ["Admin", "Employee"].includes(req.user.role);

    if (!isStaff && storage.Boat.UID !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const works = await models.Work.findAll({
      where: {
        AID,
        parentWID: null,
      },
      order: [["WID", "ASC"]],
      include: [
        {
          model: models.Work,
          as: "subtasks",
          include: [
            {
              model: models.Services,
              attributes: ["SID", "Name", "Part"],
            },
            {
              model: models.User,
              as: "User",
              attributes: ["UID", "Name"],
            },
          ],
        },
        {
          model: models.Services,
          attributes: ["SID", "Name", "Name", "Part"],
        },
        {
          model: models.User,
          as: "User",
          attributes: ["UID", "Name"],
        },
        { model: models.Seasons },
      ],
    });

    res.json(works);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error listing works by storage" });
  }
},


 async historyByBoat(req, res) {
    try {
      const BID = parseInt(req.params.bid, 10);
      if (!BID) return res.status(400).json({ error: "Invalid BID" });

      const [rows] = await sequelize.query(
  `
  SELECT
  w.WID                               AS WID,
  w.BID                               AS BID,
  w.seasonID                          AS seasonID,
  DATE(w.Date)                        AS Date,
  w.HR                                AS HR,
  w.Comment                           AS Comment,
  w.State                             AS State,
  w.parentWID                         AS parentWID,

  s.SID                               AS serviceID,
  s.Name                              AS serviceName,

  w.UID                               AS employeeID,
  TRIM(CONCAT(u.Name, ' ', COALESCE(u.Lastname, ''))) AS employeeName,

  se.year_start                       AS year_start,
  se.year_end                         AS year_end,
  se.startDate                        AS startDate,
  se.endDate                          AS endDate

FROM work w
LEFT JOIN services s ON s.SID = w.SID
LEFT JOIN users u    ON u.UID = w.UID
LEFT JOIN seasons se ON se.seasonID = w.seasonID
WHERE w.BID = :BID
ORDER BY w.Date DESC, w.WID DESC;

  `,
  { replacements: { BID } }
);


      return res.json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error while fetching work history" });
    }
  },

async listByBoat(req, res) {
  try {
    const boatId = parseInt(req.params.bid, 10);
    if (isNaN(boatId)) {
      return res.status(400).json({ error: "Invalid boat id" });
    }

    const boat = await models.Boats.findByPk(boatId, {
      include: [{ model: models.User }],
    });

    if (!boat) return res.status(404).json({ error: "Boat not found" });

    const isStaff = ["Admin", "Employee"].includes(req.user.role);
    if (!isStaff && boat.UID !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const where = { BID: boatId, parentWID: null };

    if (req.query.AID) {
      const aid = parseInt(req.query.AID, 10);
      if (Number.isNaN(aid)) {
        return res.status(400).json({ error: "Invalid AID" });
      }
      where.AID = aid;
    }

    const works = await models.Work.findAll({
      where,
      order: [["WID", "ASC"]],
      include: [
        {
          model: models.Work,
          as: "subtasks",
          include: [
            {
              model: models.Services,
              attributes: ["SID", "Name", "Part"],
            },
            {
              model: models.User,
              as: "User",
              attributes: ["UID", "Name"],
            },
          ],
        },
        { model: models.Services },
        { model: models.User, as: "User" },
        { model: models.Seasons },
      ],
    });

    res.json(works);
  } catch (e) {
    res.status(500).json({
      error: "Server error listing works for boat",
    });
  }
},

async employeeWorks(req, res) {
  console.log("employeeWorks");

  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(400).json({ error: "Missing user id in token" });
    }

    const works = await models.Work.findAll({
      where: {
        UID: userId,
        parentWID: null,
      },
      order: [["WID", "ASC"]],
      attributes: ["WID", "AID", "State", "Comment", "Date", "UID"],
      include: [
        {
          model: models.Work,
          as: "subtasks",
          attributes: ["WID", "State", "Comment"],
          include: [{ model: models.Services }],
        },
        { model: models.Services },
        {
          model: models.Boats,
          attributes: ["BID", "name"],
          required: false,
        },
        {
          model: models.User,
          as: "User",
          attributes: ["UID", "Name"],
        },
      ],
    });

    res.json(works);
  } catch (e) {
    console.error("employeeWorks error:", e);
    res.status(500).json({ error: e.message });
  }
},

    async updateState(req, res) {
    const t = await sequelize.transaction();
    try {
      const id = parseInt(req.params.id, 10);
      const { State } = req.body;

      if (!STATE_VALUES.includes(State))
        throw new Error("Invalid state");

      const rec = await models.Work.findByPk(id, { transaction: t });
      if (!rec) throw new Error("Work not found");

      const subtasks = await models.Work.findAll({
        where: { parentWID: rec.WID },
        transaction: t,
      });

      if (!rec.parentWID && subtasks.length) {
        return res.status(400).json({
          error: "Parent work state is controlled by subtasks.",
        });
      }

      rec.State = State;
      rec.Date = new Date();
      await rec.save({ transaction: t });

      if (rec.parentWID) {
        await recalcParentState(rec.parentWID, t);
      }

      await updateProblemStatusIfNeeded(rec, t);
      await t.commit();
      res.json(rec);
    } catch (e) {
      await t.rollback();
      res.status(500).json({ error: e.message });
    }
  },

   async update(req, res) {
    const t = await sequelize.transaction();
    try {
      const id = parseInt(req.params.id, 10);
      const rec = await models.Work.findByPk(id, { transaction: t });
      if (!rec) throw new Error("Work not found");

      const updates = {};
      for (const k of WORK_FIELDS_ADMIN)
        if (req.body[k] !== undefined) updates[k] = req.body[k];

      if (updates.State && !STATE_VALUES.includes(updates.State))
        throw new Error("Invalid state");

      if (rec.parentWID) {
        delete updates.HR;
        delete updates.UID;
      }

      await rec.update(updates, { transaction: t });

      if (updates.State) {
        rec.Date = new Date();
        await rec.save({ transaction: t });

        if (rec.parentWID) {
          await recalcParentState(rec.parentWID, t);
        }

        await updateProblemStatusIfNeeded(rec, t);
      }

      await t.commit();
      res.json(rec);
    } catch (e) {
      await t.rollback();
      res.status(500).json({ error: e.message || "Error updating work" });
    }
  },

  async delete(req, res) {
    const t = await sequelize.transaction();
    try {
      const id = parseInt(req.params.id, 10);
      const rec = await models.Work.findByPk(id, { transaction: t });
      if (!rec) throw new Error("Work not found");

      if (!rec.parentWID) {
        await models.Work.destroy({
          where: { parentWID: id },
          transaction: t,
        });
      }

      await rec.destroy({ transaction: t });
      await t.commit();

      res.json({ message: "Work deleted" });
    } catch (e) {
      await t.rollback();
      res.status(500).json({ error: e.message || "Error deleting work" });
    }
  },
};
