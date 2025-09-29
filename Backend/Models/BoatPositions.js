module.exports = (sequelize, DataTypes) => {
  const BoatPosition = sequelize.define("BoatPosition", {
    PositionID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    BHID: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    BID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    PosX: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false
    },
    PosY: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false
    },
    Length: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false
    },
    Width: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false
    }
  }, {
    tableName: "boat_positions",
    timestamps: true,
    createdAt: false,
    updatedAt: "updatedAt"
  });

  return BoatPosition;
};
