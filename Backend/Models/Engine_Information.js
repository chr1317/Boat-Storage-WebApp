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
      allowNull: false
    },
    Brand: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    Engine_nr: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    Reversing_gear: {
      type: DataTypes.STRING(15),
      allowNull: false
    },
    Reversing_gear_nr: {
      type: DataTypes.STRING(15),
      allowNull: false
    },
    Sterndrive: {
      type: DataTypes.STRING(15),
      allowNull: false
    },
    Sterndrive_nr: {
      type: DataTypes.STRING(15),
      allowNull: false
    },
    Transom: {
      type: DataTypes.STRING(15),
      allowNull: false
    },
    Transom_nr: {
      type: DataTypes.STRING(15),
      allowNull: false
    },
    BT: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    ST: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    Moto_H: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: "engine_information",
    timestamps: false
  });

  return EngineInformation;
};
