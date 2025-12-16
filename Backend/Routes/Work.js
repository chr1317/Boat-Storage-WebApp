const express = require("express");
const auth = require("../Middleware/Auth");
const WorkController = require("../Controllers/workController");

const router = express.Router();

router.post("/", auth(["Admin", "Employee"]), WorkController.create);

router.get("/", auth(["Admin", "Employee"]), WorkController.listAll);

router.get("/employee", auth(["Admin", "Employee"]), WorkController.employeeWorks);

router.get("/:aid", auth(["Admin", "Employee", "Client"]), WorkController.listByBoat);

router.get(
  "/history/boat/:bid", auth(["Admin", "Employee"]), WorkController.historyByBoat);

router.get("/storage/:aid", auth(["Admin", "Employee", "Client"]), WorkController.listByStorage);
  
router.put("/:id/state", auth(["Admin", "Employee"]), WorkController.updateState);

router.put("/:id", auth(["Admin", "Employee"]), WorkController.update);

router.delete("/:id", auth(["Admin", "Employee"]), WorkController.delete);

module.exports = router;
