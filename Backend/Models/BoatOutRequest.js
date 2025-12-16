module.exports = (sequelize, DataTypes) => {
  const BoatOutRequest = sequelize.define("BoatOutRequest", {
    RQID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    BID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    AID: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    seasonID: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    requestedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    handledBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    type: {
      type: DataTypes.ENUM("Launch", "Trailer"),
      allowNull: false,
    },

    preferredWeekStart: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    preferredWeekEnd: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM("Pending", "Accepted", "Rejected", "Cancelled"),
      allowNull: false,
      defaultValue: "Pending",
    },

    confirmedDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    rejectReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: "boat_out_requests",
    timestamps: true,
  });

  return BoatOutRequest;
};
