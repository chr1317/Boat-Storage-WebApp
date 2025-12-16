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
      allowNull: true
    },
    City: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    Street: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    StreetNr: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    PhoneNr: {
      type: DataTypes.STRING(13),
      allowNull: false
    },
    Email: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
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
      allowNull: true
    },
    Role: {
      type: DataTypes.ENUM("Admin", "Employee", "Client"),
      allowNull: false
    },
    MustChangePassword: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
  }, {
    tableName: "users",
    timestamps: false
  });

  return User;
};
