module.exports = (sequelize, DataTypes) => {
  const BoatDimensions = sequelize.define("BoatDimensions", {
    DID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    BID: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    Length:{
      type: DataTypes.INTEGER,
      allowNull: false
    },
    Width: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    Height: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Deepness: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Weight: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    U_Color: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    Weight_we: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    T_Color: {
      type: DataTypes.STRING(20),
      allowNull: true
    }
  }, {
    tableName: "boat_dimensions",
    timestamps: false
  });

  return BoatDimensions;
};
