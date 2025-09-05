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
    UID: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    seasonID: {
      type: DataTypes.INTEGER,
      allowNull: false
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
    }
  }, {
    tableName: "work",
    timestamps: true
  });

  return Work;
};
