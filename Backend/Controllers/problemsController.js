const { models, sequelize } = require("../Database/db");
const { Op } = require("sequelize");

const TYPE_VALUES = ["Issue", "ClientRequest"];
const STATUS_VALUES = ["New", "InProgress", "Resolved"];

// -------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------

async function findCurrentSeason(t) {
  const today = new Date();
  return models.Seasons.findOne({
    where: {
      StartDate: { [Op.lte]: today },
      EndDate: { [Op.gte]: today },
    },
    order: [["StartDate", "DESC"]],
    transaction: t,
  });
}

// -------------------------------------------------------------
// CONTROLLER
// -------------------------------------------------------------

module.exports = {
  // -----------------------------------------------------------
  // LIST ALL PROBLEMS
  // -----------------------------------------------------------
async list(req, res) {
  try {
    const isStaff = ["Admin", "Employee"].includes(req.user.role);
    const where = {};

    // opcjonalny filtr po AID – konkretne przechowywanie
    if (req.query.AID) {
      const aid = parseInt(req.query.AID, 10);
      if (Number.isNaN(aid)) {
        return res.status(400).json({ error: "Invalid AID" });
      }
      where.AID = aid;
    }

    if (isStaff) {
      const list = await models.Problems.findAll({
        where,
        order: [["PID", "ASC"]],
        include: [
          {
            model: models.Boats,
            include: [
              {
                model: models.User,
                attributes: { exclude: ["Password"] },
              },
            ],
          },
          { model: models.Work },
        ],
      });
      return res.json(list);
    }

    const list = await models.Problems.findAll({
      where,
      include: [
        {
          model: models.Boats,
          where: { UID: req.user.id },
          include: [
            {
              model: models.User,
              attributes: { exclude: ["Password"] },
            },
          ],
        },
        { model: models.Work },
      ],
      order: [["PID", "ASC"]],
    });

    res.json(list);
  } catch {
    res
      .status(500)
      .json({ error: "Server error while listing problems" });
  }
},


  // -----------------------------------------------------------
  // GET ONE
  // -----------------------------------------------------------
  async getOne(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const isStaff = ["Admin", "Employee"].includes(req.user.role);

      const rec = await models.Problems.findByPk(id, {
        include: [
          {
            model: models.Boats,
            include: [
              {
                model: models.User,
                attributes: { exclude: ["Password"] },
              },
            ],
          },
          { model: models.Work },
        ],
      });

      if (!rec) return res.status(404).json({ error: "Problem not found" });
      if (!isStaff && rec.Boat.UID !== req.user.id)
        return res.status(403).json({ error: "Forbidden" });

      res.json(rec);
    } catch {
      res.status(500).json({ error: "Server error while getting problem" });
    }
  },

  // -----------------------------------------------------------
  // CREATE PROBLEM (optional autoWork=true for staff)
  // -----------------------------------------------------------
  async create(req, res) {
  const t = await sequelize.transaction();
  try {
    const {
      AID,
      Description,
      Type,
      SID,
      Date: WorkDate,
      HR,
      Comment,
      UID,
    } = req.body;

    const autoWork = String(
      req.query.autoWork || "false"
    ).toLowerCase() === "true";

    if (!AID || !Description) {
      await t.rollback();
      return res
        .status(400)
        .json({ error: "AID and Description are required" });
    }

    // Powiązanie z konkretnym przechowywaniem
    const storage = await models.BoatStorage.findByPk(AID, {
      transaction: t,
    });
    if (!storage) {
      await t.rollback();
      return res
        .status(400)
        .json({ error: "BoatStorage (AID) not found" });
    }

    const BID = storage.BID;

    if (Type && !TYPE_VALUES.includes(Type)) {
      await t.rollback();
      return res.status(400).json({ error: "Invalid Type" });
    }

    const boat = await models.Boats.findByPk(BID, { transaction: t });
    if (!boat) {
      await t.rollback();
      return res.status(404).json({ error: "Boat not found" });
    }

    const isStaff = ["Admin", "Employee"].includes(req.user.role);

    if (!isStaff && boat.UID !== req.user.id) {
      await t.rollback();
      return res.status(403).json({ error: "Forbidden" });
    }

    // 1️⃣ Problem, przypięty do AID
    const problem = await models.Problems.create(
      {
        BID,
        AID,
        Description,
        Type: Type || (isStaff ? "Issue" : "ClientRequest"),
        Status: "New",
        ApprovedByClient: Type === "ClientRequest",
      },
      { transaction: t }
    );

    // 2️⃣ Jeżeli NIE autoWork → koniec
    if (!isStaff || !autoWork) {
      await t.commit();
      return res.status(201).json(problem);
    }

    // 3️⃣ Staff + autoWork wymaga SID
    if (!SID) {
      await t.rollback();
      return res.status(400).json({
        error: "SID is required when autoWork=true",
      });
    }

    const service = await models.Services.findByPk(SID, {
      transaction: t,
    });
    if (!service) {
      await t.rollback();
      return res
        .status(404)
        .json({ error: "Service not found" });
    }

    const seasonID = storage.seasonID;

    // 5️⃣ Tworzymy Work powiązany z problemem + AID
    const work = await models.Work.create(
      {
        SID,
        BID,
        AID,
        PID: problem.PID,
        seasonID,
        Date: WorkDate ? new Date(WorkDate) : new Date(),
        HR: HR ?? null,
        Comment:
          Comment ??
          `From problem: ${String(Description).substring(0, 40)}`,
        State: "ToDo",
        UID: UID ?? null,
      },
      { transaction: t }
    );

    await t.commit();
    res.status(201).json({ problem, work });
  } catch (e) {
    await t.rollback();
    res.status(500).json({
      error: e.message || "Server error while creating problem",
    });
  }
},


  // -----------------------------------------------------------
  // ADD WORK TO PROBLEM
  // -----------------------------------------------------------
  async addWork(req, res) {
  const t = await sequelize.transaction();
  try {
    const id = parseInt(req.params.id, 10);
    const { SID, Date: WorkDate, HR, Comment, UID } = req.body;

    const prob = await models.Problems.findByPk(id, {
      include: [{ model: models.Boats }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!prob) {
      await t.rollback();
      return res.status(404).json({ error: "Problem not found" });
    }

    const isStaff = ["Admin", "Employee"].includes(req.user.role);
    if (!isStaff) {
      await t.rollback();
      return res
        .status(403)
        .json({ error: "Only staff can add work to a problem" });
    }

    // jeżeli to Issue niezatwierdzony przez klienta → blokujemy prace
    if (prob.Type === "Issue" && !prob.ApprovedByClient) {
      await t.rollback();
      return res.status(400).json({
        error:
          "Client must approve Issue before work can be created",
      });
    }

    if (!SID) {
      await t.rollback();
      return res.status(400).json({ error: "SID is required" });
    }

    const service = await models.Services.findByPk(SID, {
      transaction: t,
    });
    if (!service) {
      await t.rollback();
      return res
        .status(404)
        .json({ error: "Service not found" });
    }

    // Ustalenie seasonID i AID dla Work
    let seasonID;
    let AID = prob.AID || null;

    if (AID) {
      const storage = await models.BoatStorage.findByPk(AID, {
        transaction: t,
      });
      if (!storage) {
        await t.rollback();
        return res.status(400).json({
          error: "BoatStorage (AID) not found for this problem",
        });
      }
      seasonID = storage.seasonID;
    } else {
      // fallback dla starych rekordów bez AID
      const currentSeason = await findCurrentSeason(t);
      if (!currentSeason) {
        await t.rollback();
        return res
          .status(400)
          .json({ error: "No active season" });
      }
      seasonID = currentSeason.seasonID;
    }

    const work = await models.Work.create(
      {
        SID,
        BID: prob.BID,
        AID,
        PID: prob.PID,
        seasonID,
        Date: WorkDate ? new Date(WorkDate) : new Date(),
        HR: HR ?? null,
        Comment:
          Comment || `Problem report: ${prob.Description}`,
        State: "ToDo",
        UID: UID ?? null,
      },
      { transaction: t }
    );

    prob.Status = "InProgress";
    await prob.save({ transaction: t });

    await t.commit();
    res.status(201).json({ problem: prob, work });
  } catch (e) {
    await t.rollback();
    res
      .status(500)
      .json({ error: e.message || "Error adding work" });
  }
},


  // -----------------------------------------------------------
  // UPDATE STATUS
  // -----------------------------------------------------------
  async updateStatus(req, res) {
    const t = await sequelize.transaction();
    try {
      const id = parseInt(req.params.id, 10);
      const { Status } = req.body;

      if (!STATUS_VALUES.includes(Status)) {
        await t.rollback();
        return res.status(400).json({ error: "Invalid Status" });
      }

      const rec = await models.Problems.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!rec) {
        await t.rollback();
        return res.status(404).json({ error: "Problem not found" });
      }

      rec.Status = Status;
      await rec.save({ transaction: t });

      await t.commit();
      res.json(rec);
    } catch {
      await t.rollback();
      res.status(500).json({ error: "Server error while updating status" });
    }
  },

  // -----------------------------------------------------------
  // UPDATE (staff / client)
  // -----------------------------------------------------------
  async update(req, res) {
    const t = await sequelize.transaction();
    try {
      const id = parseInt(req.params.id, 10);

      const rec = await models.Problems.findByPk(id, {
        include: [{ model: models.Boats }],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!rec) {
        await t.rollback();
        return res.status(404).json({ error: "Problem not found" });
      }

      const isStaff = ["Admin", "Employee"].includes(req.user.role);
      if (!isStaff && rec.Boat.UID !== req.user.id) {
        await t.rollback();
        return res.status(403).json({ error: "Forbidden" });
      }

      const updates = {};

      if (isStaff) {
        if (req.body.Description !== undefined)
          updates.Description = req.body.Description;
        if (req.body.Status !== undefined) {
          if (!STATUS_VALUES.includes(req.body.Status)) {
            await t.rollback();
            return res.status(400).json({ error: "Invalid Status" });
          }
          updates.Status = req.body.Status;
        }
        if (req.body.Type !== undefined) {
          if (!TYPE_VALUES.includes(req.body.Type)) {
            await t.rollback();
            return res.status(400).json({ error: "Invalid Type" });
          }
          updates.Type = req.body.Type;
        }
      } else {
        if (req.body.Description !== undefined)
          updates.Description = req.body.Description;
      }

      await models.Problems.update(updates, {
        where: { PID: id },
        transaction: t,
      });

      const refreshed = await models.Problems.findByPk(id, {
        include: [{ model: models.Boats }, { model: models.Work }],
        transaction: t,
      });

      await t.commit();
      res.json(refreshed);
    } catch {
      await t.rollback();
      res.status(500).json({ error: "Server error while updating problem" });
    }
  },

  // -----------------------------------------------------------
  // APPROVE PROBLEM (client approves Issue)
  // -----------------------------------------------------------
  async approve(req, res) {
    const t = await sequelize.transaction();
    try {
      const id = parseInt(req.params.id, 10);

      const rec = await models.Problems.findByPk(id, {
        include: [{ model: models.Boats }],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!rec) {
        await t.rollback();
        return res.status(404).json({ error: "Problem not found" });
      }

      // Only CLIENT can approve an Issue related to THEIR boat
      if (rec.Type !== "Issue") {
        await t.rollback();
        return res
          .status(400)
          .json({ error: "Only Issue type requires approval" });
      }

      if (rec.Boat.UID !== req.user.id) {
        await t.rollback();
        return res.status(403).json({ error: "Forbidden" });
      }

      rec.ApprovedByClient = true;
      await rec.save({ transaction: t });

      await t.commit();
      res.json({ message: "Problem approved", rec });
    } catch (e) {
      await t.rollback();
      res.status(500).json({ error: "Error approving problem" });
    }
  },
};
