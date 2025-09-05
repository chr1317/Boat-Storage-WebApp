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
      allowNull: false
    },
    Deepness: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    Weight: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    U_Color: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    Weight_we: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    T_Color: {
      type: DataTypes.STRING(20),
      allowNull: false
    }
  }, {
    tableName: "boat_dimensions",
    timestamps: false
  });

  return BoatDimensions;
};
