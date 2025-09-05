module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Boats', {
    BID: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    UID: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    HIN: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    Type: {
      type: DataTypes.STRING(15),
      allowNull: false
    },
    out: {
      type: DataTypes.DATE,
      allowNull: true
    },
    BHID: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    Drive: {
      type: DataTypes.STRING(6),
      allowNull: false
    },
    QR: {
      type: DataTypes.STRING(255),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'boats',
    timestamps: false
  });
};
