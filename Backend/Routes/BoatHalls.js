const express = require("express");
const { models, sequelize } = require("../Database/db");
const auth = require("../Middleware/Auth");

const router = express.Router();
const FIELDS = ["Length","Width","Height"];

router.post("/", auth(["Admin","Employee"]), async (req,res)=>{
  const t = await sequelize.transaction();
  try{
    const payload = {};
    for (const f of FIELDS) {
      if (req.body[f] === undefined) { await t.rollback(); return res.status(400).json({ error: `Field ${f} is required` }); }
      if (!Number.isInteger(req.body[f]) || req.body[f] <= 0) { await t.rollback(); return res.status(400).json({ error: `${f} must be a positive integer` }); }
      payload[f] = req.body[f];
    }
    const hall = await models.Boathalls.create(payload,{transaction:t});
    await t.commit(); res.status(201).json(hall);
  }catch{ await t.rollback(); res.status(500).json({error:"Server error while creating boathall"}); }
});

router.get("/", auth(["Admin","Employee"]), async (_req,res)=>{
  try{ const halls = await models.Boathalls.findAll({ order:[["BHID","ASC"]] }); res.json(halls); }
  catch{ res.status(500).json({error:"Server error while listing boathalls"}); }
});

router.get("/:id", auth(["Admin","Employee"]), async (req,res)=>{
  try{
    const id = parseInt(req.params.id,10);
    const hall = await models.Boathalls.findByPk(id);
    if(!hall) return res.status(404).json({error:"Boathall not found"});
    res.json(hall);
  }catch{ res.status(500).json({error:"Server error while getting boathall"}); }
});

router.put("/:id", auth(["Admin","Employee"]), async (req,res)=>{
  const t = await sequelize.transaction();
  try{
    const id = parseInt(req.params.id,10);
    const hall = await models.Boathalls.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});
    if(!hall){ await t.rollback(); return res.status(404).json({error:"Boathall not found"}); }

    const updates = {};
    for (const f of FIELDS) {
      if (req.body[f] !== undefined) {
        if (!Number.isInteger(req.body[f]) || req.body[f] <= 0) { await t.rollback(); return res.status(400).json({ error: `${f} must be a positive integer` }); }
        updates[f] = req.body[f];
      }
    }
    if (!Object.keys(updates).length){ await t.rollback(); return res.status(400).json({error:"No valid fields to update"}); }

    await models.Boathalls.update(updates,{where:{BHID:id},transaction:t});
    const refreshed = await models.Boathalls.findByPk(id,{transaction:t});
    await t.commit(); res.json(refreshed);
  }catch{ await t.rollback(); res.status(500).json({error:"Server error while updating boathall"}); }
});

router.delete("/:id", auth(["Admin","Employee"]), async (req,res)=>{
  const t = await sequelize.transaction();
  try{
    const id = parseInt(req.params.id,10);
    const hall = await models.Boathalls.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});
    if(!hall){ await t.rollback(); return res.status(404).json({error:"Boathall not found"}); }
    const boatsCount = await models.Boats.count({ where:{BHID:id}, transaction:t });
    if (boatsCount>0){ await t.rollback(); return res.status(409).json({error:"Boathall has assigned boats"}); }
    await models.Boathalls.destroy({ where:{BHID:id}, transaction:t });
    await t.commit(); res.json({message:"Boathall deleted"});
  }catch{ await t.rollback(); res.status(500).json({error:"Server error while deleting boathall"}); }
});

module.exports = router;
