// Backend/seed-dev.js
require('dotenv').config();
const bcrypt = require('bcrypt');
const { sequelize, models } = require('./db');

const DEFAULT_HALL_MARGIN_CM = parseInt(process.env.DEFAULT_HALL_MARGIN_CM || '15', 10);

function seasonDates() {
  const now = new Date();
  const y = now.getFullYear();
  const start = new Date(`${y}-10-01T00:00:00Z`);
  const end = new Date(`${y + 1}-04-30T23:59:59Z`);
  return {
    yStart: y,
    yEnd: y + 1,
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
  };
}

async function ensureUniqueIndexBoatStorage() {
  // bezpiecznie doda unikatowy indeks jeśli go nie ma
  const [rows] = await sequelize.query(`
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'boat_storage'
      AND index_name = 'uniq_bid_season'
    LIMIT 1;
  `);
  if (!rows || rows.length === 0) {
    await sequelize.query(`ALTER TABLE boat_storage ADD UNIQUE KEY uniq_bid_season (BID, seasonID);`);
    console.log('✓ Added unique index boat_storage(BID, seasonID)');
  }
}

async function seed(force = false) {
  if (force) {
    console.warn('⚠️ Dropping & recreating schema...');
    await sequelize.sync({ force: true });
  } else {
    await sequelize.sync();
  }

  await ensureUniqueIndexBoatStorage();

  // Users
  const admin = await models.Users.create({
    Name: 'admin',
    Password: await bcrypt.hash('Secret123!', 10),
    Email: 'admin@example.com',
    Role: 'Admin',
    PhoneNr: '123456789',
  });
  const employee = await models.Users.create({
    Name: 'worker1',
    Password: await bcrypt.hash('Worker123!', 10),
    Email: 'worker1@example.com',
    Role: 'Employee',
    PhoneNr: '123456789',
  });
  const client = await models.Users.create({
    Name: 'client1',
    Password: await bcrypt.hash('Client123!', 10),
    Email: 'client1@example.com',
    Role: 'Client',
    PhoneNr: '123456789',
  });

  // Season
  const s = seasonDates();
  const season = await models.Seasons.create({
    year_start: s.yStart,
    year_end: s.yEnd,
    startDate: s.start_date,
    endDate: s.end_date,
  });

  // Boathall
  const hall = await models.Boathalls.create({
    Length: 2000,
    Width: 2000,
    Height: 800,
    MarginCM: DEFAULT_HALL_MARGIN_CM,
  });

  // Services
  const services = await models.Services.bulkCreate([
    { Part: 'General', Name: 'Problem (Generic)' },
    { Part: 'Hull', Name: 'Hull washing' },
    { Part: 'Engine', Name: 'Oil change' },
    { Part: 'Engine', Name: 'Impeller replacement' },
    { Part: 'Deck', Name: 'Teak cleaning' },
  ]);

  // Boats
  const boat1 = await models.Boats.create({
    UID: client.UID,
    name: 'Aurora',
    HIN: 'HIN123',
    Type: 'Motor',
    out: null,
    BHID: hall.BHID,
    Drive: 'Inboard',
    QR: 'QR-AURORA',
  });
  const boat2 = await models.Boats.create({
    UID: client.UID,
    name: 'Baltic Star',
    HIN: 'HIN456',
    Type: 'Sail',
    out: null,
    BHID: hall.BHID,
    Drive: 'Outboard',
    QR: 'QR-BALTIC',
  });

  // Engine info
  await models.EngineInformation.create({
    BID: boat1.BID,
    Model: 'D3',
    Brand: 'Volvo Penta',
    Engine_nr: 'X123',
    Reversing_gear: 'RG',
    Reversing_gear_nr: 'RG-1',
    Sterndrive: 'SD',
    Sterndrive_nr: 'SD-1',
    Transom: 'TR',
    Transom_nr: 'TR-1',
    BT: 'Yes',
    ST: 'No',
    Moto_H: 120,
  });
  await models.EngineInformation.create({
    BID: boat2.BID,
    Model: 'Yamaha 50',
    Brand: 'Yamaha',
    Engine_nr: 'YAM50',
    Reversing_gear: 'Std',
    Reversing_gear_nr: 'STD-50',
    Sterndrive: 'N/A',
    Sterndrive_nr: 'N/A',
    Transom: 'Std',
    Transom_nr: 'STD-2',
    BT: 'No',
    ST: 'No',
    Moto_H: 60,
  });

  // Dimensions
  const dim1 = await models.BoatDimensions.create({
    BID: boat1.BID,
    Length: 650,
    Width: 250,
    Height: 290,
    Deepness: 70,
    Weight: 1800,
    U_Color: 'White',
    Weight_we: 1700,
    T_Color: 'Blue',
  });
  const dim2 = await models.BoatDimensions.create({
    BID: boat2.BID,
    Length: 720,
    Width: 260,
    Height: 310,
    Deepness: 75,
    Weight: 2100,
    U_Color: 'White',
    Weight_we: 2000,
    T_Color: 'Teak',
  });

  // Storage
  await models.BoatStorage.create({
    BID: boat1.BID,
    seasonID: season.seasonID,
    IsComing: true,
    ArrivalDate: null,
    Budget: null,
  });
  await models.BoatStorage.create({
    BID: boat2.BID,
    seasonID: season.seasonID,
    IsComing: true,
    ArrivalDate: null,
    Budget: 15000,
  });

  // Problems
  await models.Problems.create({
    BID: boat1.BID,
    WID: null,
    Description: 'Oil leak spotted under engine',
    Type: 'Issue',
    Status: 'New',
    CreatedAt: new Date(),
  });
  const prob2 = await models.Problems.create({
    BID: boat2.BID,
    WID: null,
    Description: 'Client requested teak cleaning',
    Type: 'ClientRequest',
    Status: 'New',
    CreatedAt: new Date(),
  });

  // Work from problem 2
  const teakService = services.find((s) => s.Name === 'Teak cleaning');
  const work2 = await models.Work.create({
    SID: teakService.SID,
    BID: boat2.BID,
    UID: employee.UID,
    Date: new Date(),
    seasonID: season.seasonID,
    HR: 0,
    Comment: 'From problem: teak cleaning',
    State: 'ToDo',
  });
  prob2.WID = work2.WID;
  prob2.Status = 'InProgress';
  await prob2.save();

  // One manual position for boat1 at (0,0) with padded dims
  const margin = hall.MarginCM || DEFAULT_HALL_MARGIN_CM;
  await models.BoatPosition.create({
    BHID: hall.BHID,
    BID: boat1.BID,
    PosX: 0,
    PosY: 0,
    Length: (dim1.Length || 0) + margin,
    Width: (dim1.Width || 0) + margin,
  });

  console.log('✅ Seed complete.');
}

module.exports = { seed };
