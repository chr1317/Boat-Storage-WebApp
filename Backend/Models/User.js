// Backend/Models/User.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("User", {
    UID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    Name: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    Lastname: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    City: {
      type: DataTypes.STRING(15),
      allowNull: false
    },
    Street: {
      type: DataTypes.STRING(15),
      allowNull: false
    },
    StreetNr: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    PhoneNr: {
      type: DataTypes.STRING(13),
      allowNull: false
    },
    Email: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    Password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    PostNr: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    Role: {
      type: DataTypes.ENUM("Admin", "Employee", "Client"),
      allowNull: false
    }
  }, {
    tableName: "users",
    timestamps: false
  });

  return User;
};
