module.exports = (sequelize, DataTypes) => {
  const BoatStorage = sequelize.define("BoatStorage", {
    AID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    BID: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    IsComing: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    ArrivalDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    seasonID: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    Budget: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: "boat_storage",
    timestamps: false
  });

  return BoatStorage;
};
