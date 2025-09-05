module.exports = (sequelize, DataTypes) => {
  const Season = sequelize.define("Season", {
    seasonID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    year_start: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    year_end: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    }
  }, {
    tableName: "seasons",
    timestamps: false
  });

  return Season;
};
