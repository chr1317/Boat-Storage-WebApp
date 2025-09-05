module.exports = (sequelize, DataTypes) => {
  const Problems = sequelize.define("Problems", {
    PID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    BID: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    WID: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Description: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    Type: {
      type: DataTypes.ENUM("Issue", "ClientRequest"),
      allowNull: false,
      defaultValue: "Issue"
    },
    Status: {
      type: DataTypes.ENUM("New", "InProgress", "Resolved"),
      allowNull: false,
      defaultValue: "New"
    }
  }, {
    tableName: "problems",
    timestamps: true 
  });

  return Problems;
};
