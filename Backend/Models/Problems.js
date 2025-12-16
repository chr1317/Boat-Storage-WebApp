// Backend/Models/Problems.js
module.exports = (sequelize, DataTypes) => {
  const Problems = sequelize.define(
    "Problems",
    {
      PID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      BID: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      AID: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      Type: {
        type: DataTypes.ENUM("Issue", "ClientRequest"),
        allowNull: false,
        defaultValue: "Issue",
      },
      Status: {
        type: DataTypes.ENUM("New", "InProgress", "Resolved"),
        allowNull: false,
        defaultValue: "New",
      },
      Description: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      ApprovedByClient: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "problems",
      timestamps: true,
    }
  );

  return Problems;
};
