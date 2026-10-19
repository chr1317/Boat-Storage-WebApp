module.exports = (sequelize, DataTypes) => {
  const EngineInformation = sequelize.define("EngineInformation", {
    EID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    BID: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    Model: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    Brand: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    Engine_nr: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    Reversing_gear: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    Reversing_gear_nr: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    Sterndrive: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    Sterndrive_nr: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    Transom: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    Transom_nr: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    BT: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    ST: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    Moto_H: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: "engine_information",
    timestamps: false
  });

  return EngineInformation;
};
