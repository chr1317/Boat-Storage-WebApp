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
    },
    MarginCM: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: parseInt(process.env.DEFAULT_HALL_MARGIN_CM || "15", 10)
    }
  }, {
    tableName: "boathalls",
    timestamps: false
  });

  return Boathall;
};
