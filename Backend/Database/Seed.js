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
    start_date: `${y}-10-01`,
    end_date: `${y + 1}-04-30`,
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

  // ======================================
  // USERS
  // ======================================
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

  // ======================================
  // SEASON
  // ======================================
  const s = seasonDates();
  const season = await models.Seasons.create({
    year_start: s.yStart,
    year_end: s.yEnd,
    startDate: s.start_date,
    endDate: s.end_date,
  });

  // ======================================
  // HALL
  // ======================================
  const hall = await models.Boathalls.create({
    Length: 3000,
    Width: 2500,
    Height: 900,
    MarginCM: DEFAULT_HALL_MARGIN_CM,
    Name: "Main Winter Hall",
  });

  // ======================================
  // SERVICES — FINAL LIST FOR DEMO
  // ======================================
  const allServices = await models.Services.bulkCreate([
    // ENGINE
    { Part: "Engine", Name: "Engine service" },
    { Part: "Engine", Name: "Oil change" },
    { Part: "Engine", Name: "Fuel filter replacement" },
    { Part: "Engine", Name: "Impeller replacement" },
    { Part: "Engine", Name: "Coolant flush" },
    { Part: "Engine", Name: "Thermostat replacement" },
    { Part: "Engine", Name: "Sea water pump service" },

    // DRIVE / PROPULSION
    { Part: "Drive", Name: "Drive service" },
    { Part: "Drive", Name: "Gear oil replacement" },
    { Part: "Drive", Name: "Propeller inspection" },
    { Part: "Drive", Name: "Stern drive inspection" },

    // HULL
    { Part: "Hull", Name: "Hull washing" },
    { Part: "Hull", Name: "Painting underside" },
    { Part: "Hull", Name: "Antifouling painting" },
    { Part: "Hull", Name: "Gelcoat polishing" },

    // DECK
    { Part: "Deck", Name: "Teak cleaning" },
    { Part: "Deck", Name: "Deck wash" },
    { Part: "Deck", Name: "Stainless steel polishing" },

    // ELECTRICAL
    { Part: "Electrical", Name: "Battery check" },
    { Part: "Electrical", Name: "Navigation lights repair" },
    { Part: "Electrical", Name: "Charging system test" },

    // SAFETY
    { Part: "Safety", Name: "Fire extinguisher check" },
    { Part: "Safety", Name: "Lifejacket inspection" },
    { Part: "Safety", Name: "Bilge pump test" },

    // WATER SYSTEM
    { Part: "Water", Name: "Water tank cleaning" },
    { Part: "Water", Name: "Pump inspection" },

    // SEASON PREP
    { Part: "Season Prep", Name: "Summer preparation" },
    { Part: "Season Prep", Name: "Winter storage preparation" },
  ]);

  // ======================================
  // BOATS (10 boats)
  // ======================================
  const boatNames = [
    "Aurora", "Sea Queen", "Blue Horizon",
    "Baltic Star", "Wind Rider", "Poseidon II",
    "Silver Wave", "Stormbreaker", "Sun Chaser",
    "North Explorer",
  ];

  const boats = [];

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

    await models.BoatStorage.create({
      BID: boat.BID,
      seasonID: season.seasonID,
      IsComing: true,
      Budget: rand(5000, 20000),
    });

    boats.push({ boat, dims });
  }

  // ======================================
  // POSITIONS
  // ======================================
  let cursorX = hall.MarginCM;
  let cursorY = hall.MarginCM;

  for (const { boat, dims } of boats) {
    const w = dims.Width + hall.MarginCM;
    const l = dims.Length + hall.MarginCM;

    if (cursorX + w > hall.Width - hall.MarginCM) {
      cursorX = hall.MarginCM;
      cursorY += 900;
    }

    await models.BoatPosition.create({
      BHID: hall.BHID,
      BID: boat.BID,
      PosX: cursorX,
      PosY: cursorY,
      Width: w,
      Length: l,
    });

    cursorX += w + hall.MarginCM;
  }

  // ======================================
  // PROBLEMS (clean, simple)
  // ======================================
  const problemTemplates = [
    { Part: "Engine", Problem: "Engine overheating" },
    { Part: "Hull", Problem: "Scratches on hull" },
    { Part: "Electrical", Problem: "Battery discharging" },
    { Part: "Deck", Problem: "Loose cleat" },
  ];

  for (const { boat } of boats) {
    const template = problemTemplates[rand(0, problemTemplates.length - 1)];

    await models.Problems.create({
      BID: boat.BID,
      Part: template.Part,
      Problem: template.Problem,
      Description: template.Problem,
      Date: new Date(),
      Solved: false,
      seasonID: season.seasonID,
    });
  }

  console.log("🎉 SIMPLE SEED COMPLETED — Ready for demo!");
}

module.exports = { seed };
