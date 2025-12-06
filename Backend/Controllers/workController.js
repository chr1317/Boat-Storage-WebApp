const { Op } = require("sequelize");
const { models, sequelize } = require("../Database/db");
const { updateProblemStatusIfNeeded } = require("./updateProblemStatus");

const STATE_VALUES = ["ToDo", "InProgress", "Done"];
const WORK_FIELDS_ADMIN = [
  "SID",
  "BID",
  "seasonID",
  "Date",
  "HR",
  "Comment",
  "UID",
  "State",
  "parentWID",
];

module.exports = {
  // ============================================================
  // CREATE WORK
  // ============================================================
  async create(req, res) {
    const t = await sequelize.transaction();
    try {
      const payload = {};
      for (const k of WORK_FIELDS_ADMIN)
        if (req.body[k] !== undefined) payload[k] = req.body[k];

      const { BID, SID, seasonID, parentWID } = payload;

      const [boat, service, season] = await Promise.all([
        models.Boats.findByPk(BID, { transaction: t }),
        models.Services.findByPk(SID, { transaction: t }),
        models.Seasons.findByPk(seasonID, { transaction: t }),
      ]);

      if (!boat) throw new Error("Boat not found");
      if (!service) throw new Error("Service not found");
      if (!season) throw new Error("Season not found");

      if (payload.State && !STATE_VALUES.includes(payload.State))
        throw new Error("Invalid work state");

      // SUBTASK RULES
      if (parentWID) {
        const parent = await models.Work.findByPk(parentWID, { transaction: t });
        if (!parent) throw new Error("Parent work not found");
        if (parent.parentWID) throw new Error("Only one level of subtasks allowed");

        // subtask nie ma HR/UID
        payload.HR = null;
        payload.UID = null;
      }

      const rec = await models.Work.create(payload, { transaction: t });
      await t.commit();
      res.status(201).json(rec);
    } catch (e) {
      await t.rollback();
      res.status(500).json({ error: e.message || "Error creating work" });
    }
  },

  // ============================================================
  // LIST ALL
  // ============================================================
  async listAll(req, res) {
    try {
      const works = await models.Work.findAll({
        where: { parentWID: null },
        order: [["WID", "ASC"]],
        include: [
          {
            model: models.Work,
            as: "subtasks",
            include: [
              { model: models.Services, attributes: ["SID", "Name", "Part"] },
              { model: models.User, as: "User", attributes: ["UID", "Name"] },
            ],
          },
          { model: models.Services, attributes: ["SID", "Name", "Part"] },
          { model: models.User, as: "User", attributes: ["UID", "Name"] },
          {
            model: models.Boats,
            attributes: ["BID", "name", "HIN", "Type", "Drive", "QR"],
            include: [
              { model: models.User, attributes: ["UID", "Name", "PhoneNr", "Email"] },
            ],
          },
          { model: models.Seasons },
        ],
      });

      res.json(works);
    } catch (e) {
      res.status(500).json({ error: "Server error listing works" });
    }
  },

  // ============================================================
  // LIST BY BOAT
  // ============================================================
  async listByBoat(req, res) {
    try {
      const boatId = parseInt(req.params.bid, 10);
      if (isNaN(boatId)) return res.status(400).json({ error: "Invalid boat id" });

      const boat = await models.Boats.findByPk(boatId, {
        include: [{ model: models.User }],
      });

      if (!boat) return res.status(404).json({ error: "Boat not found" });

      const isStaff = ["Admin", "Employee"].includes(req.user.role);
      if (!isStaff && boat.UID !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const works = await models.Work.findAll({
        where: { BID: boatId, parentWID: null },
        order: [["WID", "ASC"]],
        include: [
          {
            model: models.Work,
            as: "subtasks",
            include: [
              { model: models.Services, attributes: ["SID", "Name", "Part"] },
              { model: models.User, as: "User", attributes: ["UID", "Name"] },
            ],
          },
          { model: models.Services },
          { model: models.User, as: "User" },
          { model: models.Seasons },
        ],
      });

      res.json(works);
    } catch (e) {
      res.status(500).json({ error: "Server error listing boat works" });
    }
  },

  // ============================================================
  // EMPLOYEE WORKS
  // ============================================================
  async employeeWorks(req, res) {
    try {
      const userId = req.user.id;
      const works = await models.Work.findAll({
        where: { UID: userId, parentWID: null },
        order: [["WID", "ASC"]],
        include: [
          { model: models.Services },
          {
            model: models.Boats,
            include: [{ model: models.Boathalls }],
          },
          { model: models.User, as: "User" },
        ],
      });

      res.json(works);
    } catch (e) {
      res.status(500).json({ error: "Error fetching employee works" });
    }
  },

  // ============================================================
  // UPDATE STATE
  // ============================================================
  async updateState(req, res) {
    const t = await sequelize.transaction();
    try {
      const id = parseInt(req.params.id, 10);
      const { State } = req.body;

      if (!STATE_VALUES.includes(State))
        throw new Error("Invalid state");

      const rec = await models.Work.findByPk(id, { transaction: t });
      if (!rec) throw new Error("Work not found");

      // ========== Check if parent has subtasks ==========
      const subtasksOfParent = await models.Work.findAll({
        where: { parentWID: rec.WID },
        transaction: t,
      });

      const isParent = subtasksOfParent.length > 0;

      // Parent cannot be manually changed
      if (!rec.parentWID && isParent) {
        return res
          .status(400)
          .json({ error: "Parent work state is controlled by subtasks." });
      }

      // ========== Update own state ==========
      rec.State = State;
      rec.Date = new Date();
      await rec.save({ transaction: t });

      // ========== If subtask → update parent ==========
      if (rec.parentWID) {
        let subtasks = await models.Work.findAll({
          where: { parentWID: rec.parentWID },
          transaction: t,
        });

        subtasks = subtasks.map((s) => (s.WID === rec.WID ? rec : s));

        const parent = await models.Work.findByPk(rec.parentWID, {
          transaction: t,
        });

        const allDone = subtasks.every((s) => s.State === "Done");
        const allTodo = subtasks.every((s) => s.State === "ToDo");
        const anyInProgress = subtasks.some((s) => s.State === "InProgress");

        if (anyInProgress) parent.State = "InProgress";
        else if (allTodo) parent.State = "ToDo";
        else if (allDone) {
          parent.State = "Done";

          // max date
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

        // update problem status (parent)
        await updateProblemStatusIfNeeded(parent, t);
      }

      // update problem status (normal work)
      await updateProblemStatusIfNeeded(rec, t);

      await t.commit();
      res.json(rec);
    } catch (e) {
      await t.rollback();
      console.error("updateState error:", e);
      res.status(500).json({ error: e.message || "Error updating state" });
    }
  },

  // ============================================================
  // UPDATE WORK
  // ============================================================
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
      await t.commit();
      res.json(rec);
    } catch (e) {
      await t.rollback();
      res.status(500).json({ error: e.message || "Error updating work" });
    }
  },

  // ============================================================
  // DELETE WORK
  // ============================================================
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
