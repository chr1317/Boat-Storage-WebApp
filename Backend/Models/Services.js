module.exports = (sequelize, DataTypes) => {
  const Service = sequelize.define("Service", {
    SID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    Part: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    Name: {
      type: DataTypes.STRING(25),
      allowNull: false
    }
  }, {
    tableName: "services",
    timestamps: false
  });

  return Service;
};
