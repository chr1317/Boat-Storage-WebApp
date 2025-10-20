var DataTypes = require("sequelize").DataTypes;

var _Boats = require("./Boat");
var _Boathalls = require("./Boathalls");
var _BoatDimensions = require("./Boatdimensions");
var _BoatStorage = require("./Boat_Storage");
var _BoatPosition = require("./BoatPositions");
var _EngineInformation = require("./Engine_Information");
var _Problems = require("./Problems");
var _Seasons = require("./Seasons");
var _Services = require("./Services");
var _User = require("./User");
var _Work = require("./Work");

function initModels(sequelize) {
  var Boats = _Boats(sequelize, DataTypes);
  var Boathalls = _Boathalls(sequelize, DataTypes);
  var BoatDimensions = _BoatDimensions(sequelize, DataTypes);
  var BoatStorage = _BoatStorage(sequelize, DataTypes);
  var BoatPosition = _BoatPosition(sequelize, DataTypes);
  var EngineInformation = _EngineInformation(sequelize, DataTypes);
  var Problems = _Problems(sequelize, DataTypes);
  var Seasons = _Seasons(sequelize, DataTypes);
  var Services = _Services(sequelize, DataTypes);
  var User = _User(sequelize, DataTypes);
  var Work = _Work(sequelize, DataTypes);

  // 🔹 User ↔ Boats
  Boats.belongsTo(User, { foreignKey: "UID", onDelete: "CASCADE", onUpdate: "CASCADE" });
  User.hasMany(Boats, { foreignKey: "UID" });

  // 🔹 Boats ↔ Boathalls
  Boats.belongsTo(Boathalls, { foreignKey: "BHID", onUpdate: "CASCADE" });
  Boathalls.hasMany(Boats, { foreignKey: "BHID" });

  // 🔹 Boats ↔ BoatDimensions
  BoatDimensions.belongsTo(Boats, { foreignKey: "BID", onDelete: "CASCADE", onUpdate: "CASCADE" });
  Boats.hasOne(BoatDimensions, { foreignKey: "BID" });

  // 🔹 Boats ↔ BoatStorage ↔ Seasons
  BoatStorage.belongsTo(Boats, { foreignKey: "BID", onDelete: "CASCADE", onUpdate: "CASCADE" });
  Boats.hasMany(BoatStorage, { foreignKey: "BID" });

  BoatStorage.belongsTo(Seasons, { foreignKey: "seasonID", onDelete: "CASCADE", onUpdate: "CASCADE" });
  Seasons.hasMany(BoatStorage, { foreignKey: "seasonID" });

  // 🔹 Boats ↔ EngineInformation
  EngineInformation.belongsTo(Boats, { foreignKey: "BID", onDelete: "CASCADE", onUpdate: "CASCADE" });
  Boats.hasOne(EngineInformation, { foreignKey: "BID" });

  // 🔹 Boats ↔ BoatPosition ↔ Boathalls
  BoatPosition.belongsTo(Boats, { foreignKey: "BID", onDelete: "CASCADE", onUpdate: "CASCADE" });
  Boats.hasOne(BoatPosition, { foreignKey: "BID" });

  BoatPosition.belongsTo(Boathalls, { foreignKey: "BHID", onDelete: "CASCADE", onUpdate: "CASCADE" });
  Boathalls.hasMany(BoatPosition, { foreignKey: "BHID" });

  // 🔹 Boats ↔ Problems ↔ Work
  Problems.belongsTo(Boats, { foreignKey: "BID", onDelete: "CASCADE", onUpdate: "CASCADE" });
  Boats.hasMany(Problems, { foreignKey: "BID" });

  Problems.belongsTo(Work, { foreignKey: "WID", onDelete: "SET NULL", onUpdate: "CASCADE" });
  Work.hasMany(Problems, { foreignKey: "WID" });

  // 🔹 Boats ↔ Work ↔ Seasons ↔ Services ↔ User
  Work.belongsTo(Boats, { foreignKey: "BID", onDelete: "CASCADE", onUpdate: "CASCADE" });
  Boats.hasMany(Work, { foreignKey: "BID" });

  Work.belongsTo(Seasons, { foreignKey: "seasonID", onDelete: "CASCADE", onUpdate: "CASCADE" });
  Seasons.hasMany(Work, { foreignKey: "seasonID" });

  Work.belongsTo(Services, { foreignKey: "SID", onDelete: "CASCADE", onUpdate: "CASCADE" });
  Services.hasMany(Work, { foreignKey: "SID" });

  Work.belongsTo(User, { foreignKey: "UID", onDelete: "SET NULL", onUpdate: "CASCADE" });
  User.hasMany(Work, { foreignKey: "UID" });
  
  Work.hasMany(Work, { as: "subtasks", foreignKey: "parentWID", onDelete: "CASCADE", onUpdate: "CASCADE" });
  Work.belongsTo(Work, { as: "parent", foreignKey: "parentWID", onDelete: "CASCADE", onUpdate: "CASCADE" });


  return {
    Boats,
    Boathalls,
    BoatDimensions,
    BoatStorage,
    BoatPosition,
    EngineInformation,
    Problems,
    Seasons,
    Services,
    User,
    Work,
  };
}

module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
