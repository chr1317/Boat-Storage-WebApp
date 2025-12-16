const { models } = require("../Database/db");

async function updateProblemStatusIfNeeded(work, transaction) {
  if (!work.PID) return;

  const problem = await models.Problems.findByPk(work.PID, { transaction });
  if (!problem) return;

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
