const User = require('../models/user');
require("dotenv").config();
const env = process.env
async function seed() {
  await User.create({
    username: env.bossUser,
    email: env.bossEmail,
    password: env.bossPwd
  });
  console.log('Boss user created.');
}

seed().catch((err) => console.log(err));
