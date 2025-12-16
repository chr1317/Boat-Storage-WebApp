const { Op } = require("sequelize");
const { models, sequelize } = require("../Database/db");

const DEFAULT_HALL_MARGIN_CM = parseInt(process.env.DEFAULT_HALL_MARGIN_CM || "15", 10);

function toNum(v) {
  return typeof v === "number" ? v : parseFloat(v);
}

function asRect(r) {
  return {
    BHID: r.BHID,
    BID: r.BID,
    PosX: toNum(r.PosX),
    PosY: toNum(r.PosY),
    Width: toNum(r.Width),
    Length: toNum(r.Length),
    PositionID: r.PositionID,
  };
}

function overlaps(a, b) {
  const ax1 = a.PosX,
    ay1 = a.PosY;
  const ax2 = a.PosX + a.Width,
    ay2 = a.PosY + a.Length;

  const bx1 = b.PosX,
    by1 = b.PosY;
  const bx2 = b.PosX + b.Width,
    by2 = b.PosY + b.Length;

  const x = ax1 < bx2 && ax2 > bx1;
  const y = ay1 < by2 && ay2 > by1;
  return x && y;
}

function withinHall(rect, hall) {
  const xOk = rect.PosX >= 0 && rect.PosX + rect.Width <= toNum(hall.Width);
  const yOk = rect.PosY >= 0 && rect.PosY + rect.Length <= toNum(hall.Length);
  return xOk && yOk && rect.Width > 0 && rect.Length > 0;
}

async function paddedDimsForBoat(bid, bhid, t) {
  const dims = await models.BoatDimensions.findOne({
    where: { BID: bid },
    transaction: t,
  });

  const hall = await models.Boathalls.findByPk(bhid, { transaction: t });
  if (!dims || !hall) return null;

  const m = Number.isInteger(hall.MarginCM)
    ? hall.MarginCM
    : DEFAULT_HALL_MARGIN_CM;

  return {
    Length: toNum(dims.Length) + m,
    Width: toNum(dims.Width) + m,
    margin: m,
  };
}

async function validateRect(rect, excludeId, t) {
  const hall = await models.Boathalls.findByPk(rect.BHID, { transaction: t });
  if (!hall) return { error: "Boathall not found" };

  const R = asRect(rect);
  if (!withinHall(R, hall))
    return { error: "Rectangle exceeds boathall bounds" };

  const where = { BHID: rect.BHID };
  if (excludeId) where.PositionID = { [Op.ne]: excludeId };

  const othersRaw = await models.BoatPosition.findAll({
    where,
    transaction: t,
  });
  const others = othersRaw.map(asRect);

  for (const o of others) {
    if (overlaps(R, o)) return { error: "Rectangle overlaps with an existing boat" };
  }

  return { ok: true };
}

module.exports = {
  async create(req, res) {
    const t = await sequelize.transaction();
    try {
      const { BHID, BID, PosX, PosY } = req.body;

      if ([BHID, BID, PosX, PosY].some((v) => v === undefined || v === null)) {
        await t.rollback();
        return res
          .status(400)
          .json({ error: "BHID, BID, PosX, PosY are required" });
      }

      const boat = await models.Boats.findByPk(BID, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!boat) {
        await t.rollback();
        return res.status(404).json({ error: "Boat not found" });
      }

      if (boat.BHID !== BHID) {
        await t.rollback();
        return res.status(400).json({ error: "Boat BHID does not match position BHID" });
      }

      const exists = await models.BoatPosition.findOne({
        where: { BID },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (exists) {
        await t.rollback();
        return res
          .status(409)
          .json({ error: "Position already exists for this boat" });
      }

      const dims = await paddedDimsForBoat(BID, BHID, t);
      if (!dims || dims.Length <= 0 || dims.Width <= 0) {
        await t.rollback();
        return res.status(400).json({ error: "Missing boat dimensions" });
      }

      const rect = {
        BHID,
        BID,
        PosX: toNum(PosX),
        PosY: toNum(PosY),
        Length: dims.Length,
        Width: dims.Width,
      };

      const check = await validateRect(rect, null, t);
      if (check.error) {
        await t.rollback();
        return res.status(400).json({ error: check.error });
      }

      const pos = await models.BoatPosition.create(rect, { transaction: t });

      await t.commit();
      res.status(201).json({ ...pos.toJSON(), MarginCM: dims.margin });
    } catch (e) {
      await t.rollback();
      console.error(e);
      res.status(500).json({ error: "Server error while creating position" });
    }
  },

  async update(req, res) {
    const t = await sequelize.transaction();
    try {
      const id = parseInt(req.params.id, 10);

      const pos = await models.BoatPosition.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!pos) {
        await t.rollback();
        return res.status(404).json({ error: "Position not found" });
      }

      const nextBHID = req.body.BHID ?? pos.BHID;
      const nextBID = req.body.BID ?? pos.BID;
      const nextPosX = req.body.PosX ?? pos.PosX;
      const nextPosY = req.body.PosY ?? pos.PosY;

      const boat = await models.Boats.findByPk(nextBID, { transaction: t });
      if (!boat) {
        await t.rollback();
        return res.status(404).json({ error: "Boat not found" });
      }

      if (boat.BHID !== nextBHID) {
        await t.rollback();
        return res.status(400).json({ error: "Boat BHID does not match position BHID" });
      }

      const dims = await paddedDimsForBoat(nextBID, nextBHID, t);
      if (!dims || dims.Length <= 0 || dims.Width <= 0) {
        await t.rollback();
        return res.status(400).json({ error: "Missing boat dimensions" });
      }

      const rect = {
        BHID: nextBHID,
        BID: nextBID,
        PosX: nextPosX,
        PosY: nextPosY,
        Length: dims.Length,
        Width: dims.Width,
      };

      const check = await validateRect(rect, id, t);
      if (check.error) {
        await t.rollback();
        return res.status(400).json({ error: check.error });
      }

      await models.BoatPosition.update(rect, {
        where: { PositionID: id },
        transaction: t,
      });

      const refreshed = await models.BoatPosition.findByPk(id, {
        transaction: t,
      });

      await t.commit();
      res.json({ ...refreshed.toJSON(), MarginCM: dims.margin });
    } catch (e) {
      await t.rollback();
      console.error(e);
      res.status(500).json({ error: "Server error while updating position" });
    }
  },

  async remove(req, res) {
    const t = await sequelize.transaction();
    try {
      const id = parseInt(req.params.id, 10);

      const pos = await models.BoatPosition.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!pos) {
        await t.rollback();
        return res.status(404).json({ error: "Position not found" });
      }

      await models.BoatPosition.destroy({
        where: { PositionID: id },
        transaction: t,
      });

      await t.commit();
      res.json({ message: "Position deleted" });
    } catch (e) {
      await t.rollback();
      console.error(e);
      res.status(500).json({ error: "Server error while deleting position" });
    }
  },

  async listByHall(req, res) {
    try {
      const bhid = parseInt(req.params.bhid, 10);
      const list = await models.BoatPosition.findAll({
        where: { BHID: bhid },
        order: [["PositionID", "ASC"]],
        include: [{ model: models.Boats }],
      });

      res.json(list);
    } catch (e) {
      console.error(e);
      res
        .status(500)
        .json({ error: "Server error while listing positions" });
    }
  },

  async getByBoat(req, res) {
    try {
      const bid = parseInt(req.params.bid, 10);

      const pos = await models.BoatPosition.findOne({
        where: { BID: bid },
        include: [
          { model: models.Boats },
          { model: models.Boathalls },
        ],
      });

      if (!pos) return res.status(404).json({ error: "Position not found" });

      const isStaff = ["Admin", "Employee"].includes(req.user.role);

      if (!isStaff && pos.Boat.UID !== req.user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      res.json(pos);
    } catch (e) {
      console.error(e);
      res
        .status(500)
        .json({ error: "Server error while getting position" });
    }
  },

  async simulate(req, res) {
    const t = await sequelize.transaction();
    try {
      const bhid = parseInt(req.params.bhid, 10);

      const hall = await models.Boathalls.findByPk(bhid, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!hall) {
        await t.rollback();
        return res.status(404).json({ error: "Boathall not found" });
      }

      const margin = Number.isInteger(hall.MarginCM)
        ? hall.MarginCM
        : DEFAULT_HALL_MARGIN_CM;

      const boats = await models.Boats.findAll({
        where: { BHID: bhid },
        include: [{ model: models.BoatDimensions }],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      const items = boats
        .map((b) => {
          const d = b.BoatDimension || {};
          return {
            BID: b.BID,
            Length: (d.Length ?? 0) + margin,
            Width: (d.Width ?? 0) + margin,
          };
        })
        .filter((x) => x.Length > 0 && x.Width > 0);

      items.sort((a, b) => b.Length - a.Length);

      const placed = [];
      const notPlaced = [];

      let currentY = 0,
        rowHeight = 0,
        currentX = 0;

      for (const it of items) {
        if (currentX + it.Width > hall.Width) {
          currentY += rowHeight;
          currentX = 0;
          rowHeight = 0;
        }

        if (currentY + it.Length > hall.Length) {
          notPlaced.push({
            BID: it.BID,
            reason: "No space in hall",
          });
          continue;
        }

        placed.push({
          BID: it.BID,
          PosX: currentX,
          PosY: currentY,
          Length: it.Length,
          Width: it.Width,
        });

        currentX += it.Width;
        rowHeight = Math.max(rowHeight, it.Length);
      }

      for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
          if (overlaps(placed[i], placed[j])) {
            await t.rollback();
            return res.status(500).json({
              error: "Internal packing error: collision",
            });
          }
        }

        if (!withinHall({ BHID: bhid, ...placed[i] }, hall)) {
          await t.rollback();
          return res.status(500).json({
            error: "Internal packing error: out of bounds",
          });
        }
      }

      await t.commit();

      res.json({
        hall: {
          BHID: bhid,
          Width: hall.Width,
          Length: hall.Length,
          MarginCM: margin,
        },
        placed,
        notPlaced,
      });
    } catch (e) {
      await t.rollback();
      console.error(e);
      res
        .status(500)
        .json({ error: "Server error while simulating positions" });
    }
  },

  async optimize(req, res) {
    const t = await sequelize.transaction();
    try {
      const bhid = parseInt(req.params.bhid, 10);
      const { placements, replaceAll = true } = req.body || {};

      if (!Array.isArray(placements) || placements.length === 0) {
        await t.rollback();
        return res
          .status(400)
          .json({ error: "placements array is required" });
      }

      const hall = await models.Boathalls.findByPk(bhid, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!hall) {
        await t.rollback();
        return res.status(404).json({ error: "Boathall not found" });
      }

      const margin = Number.isInteger(hall.MarginCM)
        ? hall.MarginCM
        : DEFAULT_HALL_MARGIN_CM;

      const recalculated = [];

      for (const p of placements) {
        if (
          p.BID === undefined ||
          p.PosX === undefined ||
          p.PosY === undefined
        ) {
          await t.rollback();
          return res.status(400).json({
            error: "BID, PosX and PosY are required for each placement",
          });
        }

        const boat = await models.Boats.findByPk(p.BID, { transaction: t });
        if (!boat) {
          await t.rollback();
          return res.status(404).json({ error: `Boat not found: ${p.BID}` });
        }

        if (boat.BHID !== bhid) {
          await t.rollback();
          return res.status(400).json({
            error: `Boat ${p.BID} does not belong to hall ${bhid}`,
          });
        }

        const dims = await models.BoatDimensions.findOne({
          where: { BID: p.BID },
          transaction: t,
        });

        if (!dims) {
          await t.rollback();
          return res.status(400).json({
            error: `Missing dimensions for boat ${p.BID}`,
          });
        }

        const row = {
          BHID: bhid,
          BID: p.BID,
          PosX: p.PosX,
          PosY: p.PosY,
          Length: (dims.Length ?? 0) + margin,
          Width: (dims.Width ?? 0) + margin,
        };

        if (!withinHall(row, hall)) {
          await t.rollback();
          return res.status(400).json({
            error: `Placement out of bounds for boat ${p.BID}`,
          });
        }

        recalculated.push(row);
      }

      for (let i = 0; i < recalculated.length; i++) {
        for (let j = i + 1; j < recalculated.length; j++) {
          if (overlaps(recalculated[i], recalculated[j])) {
            await t.rollback();
            return res.status(400).json({
              error: `Collision between boats ${recalculated[i].BID} and ${recalculated[j].BID}`,
            });
          }
        }
      }

      if (replaceAll) {
        await models.BoatPosition.destroy({
          where: { BHID: bhid },
          transaction: t,
        });
      }

      for (const r of recalculated) {
        const existing = await models.BoatPosition.findOne({
          where: { BID: r.BID },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (existing) {
          await models.BoatPosition.update(r, {
            where: { PositionID: existing.PositionID },
            transaction: t,
          });
        } else {
          await models.BoatPosition.create(r, { transaction: t });
        }
      }

      await t.commit();

      res.json({
        message: "Positions optimized",
        count: recalculated.length,
        MarginCM: margin,
      });
    } catch (e) {
      await t.rollback();
      console.error(e);
      res.status(500).json({
        error: "Server error while optimizing positions",
      });
    }
  },
};
