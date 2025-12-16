const express = require("express");
const auth = require("../Middleware/Auth");
const WorkController = require("../Controllers/workController");

const router = express.Router();

// CREATE
router.post("/", auth(["Admin", "Employee"]), WorkController.create);

// LIST ALL
router.get("/", auth(["Admin", "Employee"]), WorkController.listAll);


// EMPLOYEE WORKS
router.get("/employee", auth(["Admin", "Employee"]), WorkController.employeeWorks);

// LIST BY BOAT
router.get("/:aid", auth(["Admin", "Employee", "Client"]), WorkController.listByBoat);

router.get(
  "/history/boat/:bid", auth(["Admin", "Employee"]), WorkController.historyByBoat);

router.get("/storage/:aid", auth(["Admin", "Employee", "Client"]), WorkController.listByStorage);
  
// UPDATE STATE
router.put("/:id/state", auth(["Admin", "Employee"]), WorkController.updateState);

// UPDATE
router.put("/:id", auth(["Admin", "Employee"]), WorkController.update);

// DELETE
router.delete("/:id", auth(["Admin", "Employee"]), WorkController.delete);

module.exports = router;
