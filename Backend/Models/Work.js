// Backend/Models/Work.js
module.exports = (sequelize, DataTypes) => {
  const Work = sequelize.define("Work", {
    WID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    SID: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    BID: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    AID: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    UID: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    PID: {
  type: DataTypes.INTEGER,
  allowNull: true,
  references: { model: "problems", key: "PID" }
},
    Date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    HR: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Comment: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    State: {
      type: DataTypes.ENUM("InProgress", "Done", "ToDo"),
      allowNull: false,
      defaultValue: "ToDo"
    },
    parentWID: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "work",
        key: "WID"
      },
      onDelete: "CASCADE"
    }
  }, {
    tableName: "work",
    timestamps: true
  });

  return Work;
};
