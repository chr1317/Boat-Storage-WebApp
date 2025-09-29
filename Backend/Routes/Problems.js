// Backend/routes/problems.js
const express = require("express");
const { Op } = require("sequelize");
const { models, sequelize } = require("../Database/db");
const auth = require("../Middleware/Auth");

const router = express.Router();

const TYPE_VALUES = ["Issue", "ClientRequest"];
const STATUS_VALUES = ["New", "InProgress", "Resolved"];

/* Helper: pick current season (StartDate <= today <= EndDate) */
async function findCurrentSeason(t) {
  const today = new Date();
  return models.Seasons.findOne({
    where: { StartDate: { [Op.lte]: today }, EndDate: { [Op.gte]: today } },
    order: [["StartDate", "DESC"]],
    transaction: t,
    lock: t?.LOCK?.UPDATE
  });
}

/* GET /problems — staff: all, client: only own boats */
router.get("/", auth(["Admin", "Employee", "Client"]), async (req, res) => {
  try {
    const isStaff = ["Admin", "Employee"].includes(req.user.role);
    if (isStaff) {
      const list = await models.Problems.findAll({
        order: [["PID", "ASC"]],
        include: [
          { model: models.Boats, include: [{ model: models.Users, attributes: { exclude: ["Password"] } }] },
          { model: models.Work }
        ]
      });
      return res.json(list);
    }
    const list = await models.Problems.findAll({
      include: [
        { model: models.Boats, where: { UID: req.user.id }, include: [{ model: models.Users, attributes: { exclude: ["Password"] } }] },
        { model: models.Work }
      ],
      order: [["PID", "ASC"]]
    });
    res.json(list);
  } catch {
    res.status(500).json({ error: "Server error while listing problems" });
  }
});

/* GET /problems/:id — staff: any, client: only own */
router.get("/:id", auth(["Admin", "Employee", "Client"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const isStaff = ["Admin", "Employee"].includes(req.user.role);
    const rec = await models.Problems.findByPk(id, {
      include: [
        { model: models.Boats, include: [{ model: models.Users, attributes: { exclude: ["Password"] } }] },
        { model: models.Work }
      ]
    });
    if (!rec) return res.status(404).json({ error: "Problem not found" });
    if (!isStaff && rec.Boat.UID !== req.user.id) return res.status(403).json({ error: "Forbidden" });
    res.json(rec);
  } catch {
    res.status(500).json({ error: "Server error while getting problem" });
  }
});

/* POST /problems — create Problem only; staff may use ?autoWork=true to immediately create Work (requires SID) */
router.post("/", auth(["Admin", "Employee", "Client"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { BID, Description, Type, SID, Date, HR, Comment, UID } = req.body;
    const autoWork = String(req.query.autoWork || "false").toLowerCase() === "true";
    if (!BID || !Description) {
      await t.rollback();
      return res.status(400).json({ error: "BID and Description are required" });
    }
    if (Type && !TYPE_VALUES.includes(Type)) {
      await t.rollback();
      return res.status(400).json({ error: "Invalid Type" });
    }
    const boat = await models.Boats.findByPk(BID, { transaction: t, lock: t.LOCK.UPDATE });
    if (!boat) { await t.rollback(); return res.status(404).json({ error: "Boat not found" }); }

    const isStaff = ["Admin", "Employee"].includes(req.user.role);
    if (!isStaff && boat.UID !== req.user.id) {
      await t.rollback();
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!isStaff || !autoWork) {
      const problem = await models.Problems.create({
        BID,
        WID: null,
        Description,
        Type: Type || (isStaff ? "Issue" : "ClientRequest"),
        Status: "New",
        CreatedAt: new Date()
      }, { transaction: t });
      await t.commit();
      return res.status(201).json(problem);
    }

    if (!SID) { await t.rollback(); return res.status(400).json({ error: "SID is required when autoWork=true" }); }
    const service = await models.Services.findByPk(SID, { transaction: t });
    if (!service) { await t.rollback(); return res.status(404).json({ error: "Service not found" }); }

    const currentSeason = await findCurrentSeason(t);
    if (!currentSeason) { await t.rollback(); return res.status(400).json({ error: "No active season" }); }

    const work = await models.Work.create({
      SID,
      BID,
      seasonID: currentSeason.seasonID,
      Date: Date ? new Date(Date) : new Date(),
      HR: HR ?? null,
      Comment: Comment ?? `From problem: ${String(Description).substring(0, 40)}`,
      State: "ToDo",
      UID: UID ?? null
    }, { transaction: t });

    const problem = await models.Problems.create({
      BID,
      WID: work.WID,
      Description,
      Type: Type || "Issue",
      Status: "InProgress",
      CreatedAt: new Date()
    }, { transaction: t });

    await t.commit();
    res.status(201).json({ problem, work });
  } catch {
    await t.rollback();
    res.status(500).json({ error: "Server error while creating problem" });
  }
});

/* POST /problems/:id/work — staff creates Work from Problem; Problem moves New -> InProgress */
router.post("/:id/work", auth(["Admin", "Employee"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = parseInt(req.params.id, 10);
    const { SID, Date, HR, Comment, UID } = req.body;
    if (!SID) { await t.rollback(); return res.status(400).json({ error: "SID is required" }); }

    const prob = await models.Problems.findByPk(id, {
      include: [{ model: models.Boats }],
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (!prob) { await t.rollback(); return res.status(404).json({ error: "Problem not found" }); }
    if (prob.WID) { await t.rollback(); return res.status(400).json({ error: "Problem already linked to work" }); }

    const service = await models.Services.findByPk(SID, { transaction: t });
    if (!service) { await t.rollback(); return res.status(404).json({ error: "Service not found" }); }

    const currentSeason = await findCurrentSeason(t);
    if (!currentSeason) { await t.rollback(); return res.status(400).json({ error: "No active season" }); }

    const work = await models.Work.create({
      SID,
      BID: prob.BID,
      seasonID: currentSeason.seasonID,
      Date: Date ? new Date(Date) : new Date(),
      HR: HR ?? null,
      Comment: Comment ?? `From problem: ${String(prob.Description).substring(0, 40)}`,
      State: "ToDo",
      UID: UID ?? null
    }, { transaction: t });

    prob.WID = work.WID;
    prob.Status = "InProgress";
    await prob.save({ transaction: t });

    await t.commit();
    res.status(201).json({ problem: prob, work });
  } catch {
    await t.rollback();
    res.status(500).json({ error: "Server error while creating work from problem" });
  }
});

/* PUT /problems/:id/status — staff updates problem status */
router.put("/:id/status", auth(["Admin", "Employee"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = parseInt(req.params.id, 10);
    const { Status } = req.body;
    if (!STATUS_VALUES.includes(Status)) {
      await t.rollback();
      return res.status(400).json({ error: "Invalid Status" });
    }
    const rec = await models.Problems.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!rec) { await t.rollback(); return res.status(404).json({ error: "Problem not found" }); }
    rec.Status = Status;
    await rec.save({ transaction: t });
    await t.commit();
    res.json(rec);
  } catch {
    await t.rollback();
    res.status(500).json({ error: "Server error while updating problem status" });
  }
});

/* PUT /problems/:id — staff: change Description/Type; client: change own Description */
router.put("/:id", auth(["Admin", "Employee", "Client"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = parseInt(req.params.id, 10);
    const rec = await models.Problems.findByPk(id, {
      include: [{ model: models.Boats }],
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (!rec) { await t.rollback(); return res.status(404).json({ error: "Problem not found" }); }

    const isStaff = ["Admin", "Employee"].includes(req.user.role);
    if (!isStaff && rec.Boat.UID !== req.user.id) {
      await t.rollback();
      return res.status(403).json({ error: "Forbidden" });
    }

    const updates = {};
    if (isStaff) {
      if (req.body.Description !== undefined) updates.Description = req.body.Description;
      if (req.body.Type !== undefined) {
        if (!TYPE_VALUES.includes(req.body.Type)) {
          await t.rollback();
          return res.status(400).json({ error: "Invalid Type" });
        }
        updates.Type = req.body.Type;
      }
    } else {
      if (req.body.Description !== undefined) updates.Description = req.body.Description;
    }

    await models.Problems.update(updates, { where: { PID: id }, transaction: t });
    const refreshed = await models.Problems.findByPk(id, { transaction: t });
    await t.commit();
    res.json(refreshed);
  } catch {
    await t.rollback();
    res.status(500).json({ error: "Server error while updating problem" });
  }
});

module.exports = router;
