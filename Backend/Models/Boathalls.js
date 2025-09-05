module.exports = (sequelize, DataTypes) => {
  const Boathall = sequelize.define("Boathall", {
    BHID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    Length: {
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
    }
  }, {
    tableName: "boathalls",
    timestamps: false
  });

  return Boathall;
};
