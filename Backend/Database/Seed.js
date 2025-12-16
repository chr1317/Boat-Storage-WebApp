require("dotenv").config();
const bcrypt = require("bcrypt");
const { sequelize, models } = require("./db");

const DEFAULT_HALL_MARGIN_CM = parseInt(process.env.DEFAULT_HALL_MARGIN_CM || "20", 10);

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function seasonDates() {
  const now = new Date();
  const y = now.getFullYear();
  return {
    yStart: y,
    yEnd: y + 1,
    startDate: `${y}-10-01`,
    endDate: `${y + 1}-04-30`,
  };
}


async function ensureUniqueIndexBoatStorage() {
  await sequelize.query(`
    ALTER TABLE boat_storage 
    ADD UNIQUE KEY uniq_bid_season (BID, seasonID)
  `).catch(() => {});
}

async function seed(force = false) {
  if (force) {
    console.log("⚠ Dropping schema...");
    await sequelize.sync({ force: true });
  } else {
    await sequelize.sync();
  }

  await ensureUniqueIndexBoatStorage();

  // ============================
  // USERS
  // ============================
  const admin = await models.User.create({
    Name: "Admin",
    Password: await bcrypt.hash("Admin123!", 10),
    Email: "admin@example.com",
    Role: "Admin",
    PhoneNr: "111222333",
  });

  const employee = await models.User.create({
    Name: "Worker",
    Password: await bcrypt.hash("Worker123!", 10),
    Email: "worker@example.com",
    Role: "Employee",
    PhoneNr: "222333444",
  });

  const clients = await models.User.bulkCreate([
    {
      Name: "Michael",
      Lastname: "Smith",
      Password: await bcrypt.hash("Client123!", 10),
      Email: "michael@example.com",
      Role: "Client",
      PhoneNr: "501600100",
    },
    {
      Name: "Anna",
      Lastname: "Korska",
      Password: await bcrypt.hash("Client123!", 10),
      Email: "anna@example.com",
      Role: "Client",
      PhoneNr: "501600200",
    },
    {
      Name: "John",
      Lastname: "Waves",
      Password: await bcrypt.hash("Client123!", 10),
      Email: "john@example.com",
      Role: "Client",
      PhoneNr: "501600300",
    },
  ]);

const s = seasonDates();
const season = await models.Seasons.create({
  year_start: s.yStart,
  year_end: s.yEnd,
  startDate: s.startDate, // ← POPRAWNE
  endDate: s.endDate,     // ← POPRAWNE
});



  // ============================
  // HALL
  // ============================
  const hall = await models.Boathalls.create({
    Length: 3000,
    Width: 2500,
    Height: 900,
    MarginCM: DEFAULT_HALL_MARGIN_CM,
    Name: "Main Winter Hall",
  });

  // ============================
  // SERVICES
  // ============================
  await models.Services.bulkCreate([
    { Part: "Engine", Name: "Engine service" },
    { Part: "Engine", Name: "Oil change" },
    { Part: "Hull", Name: "Hull washing" },
    { Part: "Deck", Name: "Teak cleaning" },
    { Part: "Drive", Name: "Gear oil replacement" },
  ]);

  // ============================
  // BOATS + STORAGE + POSITION
  // ============================
  const boatNames = [
    "Aurora", "Sea Queen", "Blue Horizon",
    "Stormbreaker", "Sun Chaser", "North Explorer",
  ];

  const boats = [];

  let cursorX = hall.MarginCM;
  let cursorY = hall.MarginCM;

  for (let i = 0; i < boatNames.length; i++) {
    const client = clients[i % clients.length];

    const boat = await models.Boats.create({
      UID: client.UID,
      name: boatNames[i],
      HIN: `HIN-${1000 + i}`,
      Type: ["Motor", "Sail", "RIB"][i % 3],
      Drive: ["Inboard", "Outboard"][i % 2],
      BHID: hall.BHID,
      QR: `QR-${boatNames[i].toUpperCase().replace(" ", "-")}`,
    });

    const dims = await models.BoatDimensions.create({
      BID: boat.BID,
      Length: rand(550, 900),
      Width: rand(220, 320),
      Height: rand(250, 350),
      Deepness: rand(60, 100),
      Weight: rand(1500, 3500),
      U_Color: ["White", "Blue", "Grey"][i % 3],
      Weight_we: rand(1200, 3000),
      T_Color: ["Brown", "Teak", "White"][i % 3],
    });

    // STORAGE AID RECORD
    const storage = await models.BoatStorage.create({
      BID: boat.BID,
      seasonID: season.seasonID,
      IsComing: true,
      ArrivalDate: new Date(),
      Budget: rand(5000, 20000),
    });

    // POSITION LINKED TO AID
    const w = dims.Width + hall.MarginCM;
    const l = dims.Length + hall.MarginCM;

    if (cursorX + w > hall.Width - hall.MarginCM) {
      cursorX = hall.MarginCM;
      cursorY += 900;
    }

    await models.BoatPosition.create({
      AID: storage.AID,
      BHID: hall.BHID,
      BID: boat.BID,
      PosX: cursorX,
      PosY: cursorY,
      Width: w,
      Length: l,
    });

    cursorX += w + hall.MarginCM;

    boats.push({ boat, storage });
  }

  // ============================
  // PROBLEMS — per AID (not per season)
  // ============================
  for (const { boat, storage } of boats) {
    await models.Problems.create({
      AID: storage.AID,
      BID: boat.BID,
      Part: "Engine",
      Problem: "Engine overheating",
      Description: "Detected during initial inspection",
      Date: new Date(),
      Solved: false,
    });
  }

  // ============================
  // WORK — demo entries
  // ============================
  for (const { boat, storage } of boats) {
    await models.Work.create({
      AID: storage.AID,
      BID: boat.BID,
      SID: 1,
      Comment: "General checkup",
      Date: new Date(),
      HR: 2,
      State: "ToDo",
    });
  }

  console.log("🎉 FULLY UPDATED SEED COMPLETED — SYSTEM WORKS WITH AID!");
}

module.exports = { seed };
