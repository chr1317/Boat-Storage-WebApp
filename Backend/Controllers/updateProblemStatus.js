const { models } = require("../Database/db");

// ============================================================
// UPDATE PROBLEM STATUS WHEN ANY WORK CHANGES STATE
// ============================================================
async function updateProblemStatusIfNeeded(work, transaction) {
  // work does NOT belong to any problem → no-op
  if (!work.PID) return;

  const problem = await models.Problems.findByPk(work.PID, { transaction });
  if (!problem) return;

  // all works belonging to this problem
  const works = await models.Work.findAll({
    where: { PID: work.PID },
    transaction
  });

  const allDone = works.every(w => w.State === "Done");
  const allTodo = works.every(w => w.State === "ToDo");
  const anyInProgress = works.some(w => w.State === "InProgress");

  if (allDone) {
    problem.Status = "Resolved";
  } else if (anyInProgress) {
    problem.Status = "InProgress";
  } else if (allTodo) {
    problem.Status = "ToDo";
  } else {
    problem.Status = "InProgress";
  }

  await problem.save({ transaction });
}

module.exports = {
  updateProblemStatusIfNeeded,
};
