const { updateProblemStatusIfNeeded } = require("../Controllers/updateProblemStatus");

jest.mock("../Database/db", () => {
  return {
    models: {
      Problems: {
        findByPk: jest.fn(),
      },
      Work: {
        findAll: jest.fn(),
      },
    },
  };
});

const { models } = require("../Database/db");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("updateProblemStatusIfNeeded", () => {
  it("should no-op if work has no PID", async () => {
    const work = { WID: 1, PID: null, State: "Done" };
    const transaction = { id: "t1" };

    await updateProblemStatusIfNeeded(work, transaction);

    expect(models.Problems.findByPk).not.toHaveBeenCalled();
    expect(models.Work.findAll).not.toHaveBeenCalled();
  });

  it("should no-op if problem not found", async () => {
    const work = { WID: 1, PID: 123, State: "Done" };
    const transaction = { id: "t1" };

    models.Problems.findByPk.mockResolvedValue(null);

    await updateProblemStatusIfNeeded(work, transaction);

    expect(models.Problems.findByPk).toHaveBeenCalledWith(123, { transaction });
    expect(models.Work.findAll).not.toHaveBeenCalled();
  });

  it('should set problem.Status="Resolved" if all works are Done', async () => {
    const work = { WID: 1, PID: 10, State: "Done" };
    const transaction = { id: "t1" };

    const problem = { PID: 10, Status: "ToDo", save: jest.fn() };
    models.Problems.findByPk.mockResolvedValue(problem);

    models.Work.findAll.mockResolvedValue([
      { State: "Done" },
      { State: "Done" },
    ]);

    await updateProblemStatusIfNeeded(work, transaction);

    expect(models.Work.findAll).toHaveBeenCalledWith({
      where: { PID: 10 },
      transaction,
    });

    expect(problem.Status).toBe("Resolved");
    expect(problem.save).toHaveBeenCalledWith({ transaction });
  });

  it('should set problem.Status="InProgress" if any work is InProgress', async () => {
    const work = { WID: 1, PID: 11, State: "InProgress" };
    const transaction = { id: "t1" };

    const problem = { PID: 11, Status: "ToDo", save: jest.fn() };
    models.Problems.findByPk.mockResolvedValue(problem);

    models.Work.findAll.mockResolvedValue([
      { State: "ToDo" },
      { State: "InProgress" },
      { State: "Done" },
    ]);

    await updateProblemStatusIfNeeded(work, transaction);

    expect(problem.Status).toBe("InProgress");
    expect(problem.save).toHaveBeenCalledWith({ transaction });
  });

  it('should set problem.Status="ToDo" if all works are ToDo', async () => {
    const work = { WID: 1, PID: 12, State: "ToDo" };
    const transaction = { id: "t1" };

    const problem = { PID: 12, Status: "InProgress", save: jest.fn() };
    models.Problems.findByPk.mockResolvedValue(problem);

    models.Work.findAll.mockResolvedValue([
      { State: "ToDo" },
      { State: "ToDo" },
    ]);

    await updateProblemStatusIfNeeded(work, transaction);

    expect(problem.Status).toBe("ToDo");
    expect(problem.save).toHaveBeenCalledWith({ transaction });
  });

  it('should set problem.Status="InProgress" for mixed states with no InProgress (fallback else)', async () => {
    // np. ToDo + Done => nie allTodo, nie allDone, anyInProgress=false => else => InProgress
    const work = { WID: 1, PID: 13, State: "Done" };
    const transaction = { id: "t1" };

    const problem = { PID: 13, Status: "ToDo", save: jest.fn() };
    models.Problems.findByPk.mockResolvedValue(problem);

    models.Work.findAll.mockResolvedValue([
      { State: "ToDo" },
      { State: "Done" },
    ]);

    await updateProblemStatusIfNeeded(work, transaction);

    expect(problem.Status).toBe("InProgress");
    expect(problem.save).toHaveBeenCalledWith({ transaction });
  });

  it("should pass transaction through to all DB calls", async () => {
    const work = { WID: 1, PID: 99, State: "Done" };
    const transaction = { id: "tx-99" };

    const problem = { PID: 99, Status: "ToDo", save: jest.fn() };
    models.Problems.findByPk.mockResolvedValue(problem);
    models.Work.findAll.mockResolvedValue([{ State: "Done" }]);

    await updateProblemStatusIfNeeded(work, transaction);

    expect(models.Problems.findByPk).toHaveBeenCalledWith(99, { transaction });
    expect(models.Work.findAll).toHaveBeenCalledWith({
      where: { PID: 99 },
      transaction,
    });
    expect(problem.save).toHaveBeenCalledWith({ transaction });
  });
});
