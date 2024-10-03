#!/bin/bash

# Check for the -p flag and the project name
while getopts p: flag
do
    case "${flag}" in
        p) PROJECT_NAME=${OPTARG};;
    esac
done

if [ -z "$PROJECT_NAME" ]
then
    echo "Error: You haven't provide a project name. Installing in root folder."
    exit
else
    mkdir -p "$PROJECT_NAME"
    cd "$PROJECT_NAME" || exit
    echo "Project directory '$PROJECT_NAME' created and moved into."
fi

npm init -y
# Install necessary packages
npm install express sequelize passport passport-local bcryptjs express-session sqlite3 nodemailer ejs dotenv

# Create folder structure
mkdir -p config models seeders views results results/storico docs

# Create .env file for email configuration
cat <<EOL > .env
EMAIL_HOST=smtp.yourserver.com
EMAIL_PORT=587
EMAIL_USER=your_email@domain.com
EMAIL_PASS=your_password
EOL

# Create Sequelize config file
mkdir -p config
cat <<EOL > config/database.js
const { Sequelize } = require('sequelize');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite'
});
module.exports = sequelize;
EOL

# Create User model
mkdir -p models
cat <<EOL > models/user.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

// Before saving the user, hash the password
User.beforeSave(async (user) => {
  if (user.changed('password')) {
    user.password = await bcrypt.hash(user.password, 10);
  }
});

module.exports = User;
EOL

# Create seed file for boss user
mkdir -p seeders
cat <<EOL > seeders/seed-users.js
const User = require('../models/user');

async function seed() {
  await User.create({
    username: 'boss',
    email: 'boss@example.com',
    password: 'boss123'
  });
  console.log('Boss user created.');
}

seed().catch((err) => console.log(err));
EOL

# Create views (login, register, contacts)
mkdir -p views
cat <<EOL > views/login.ejs
<form action="/login" method="POST">
  <h1>Login</h1>
  <input type="text" name="username" placeholder="Username" required />
  <input type="password" name="password" placeholder="Password" required />
  <button type="submit">Login</button>
  <a href="/register">Register</a>
</form>
EOL

cat <<EOL > views/register.ejs
<form action="/register" method="POST">
  <h1>Register</h1>
  <input type="text" name="username" placeholder="Username" required />
  <input type="email" name="email" placeholder="Email" required />
  <input type="password" name="password" placeholder="Password" required />
  <button type="submit">Register</button>
</form>
EOL

cat <<EOL > views/contacts.ejs
<h1>Welcome, <%= user.username %></h1>

<form action="/send-email" method="POST">
  <input type="email" name="email" placeholder="Recipient's email" required />
  <input type="text" name="subject" placeholder="Email Subject" required />
  <textarea name="message" placeholder="Email Message" required></textarea>
  <button type="submit">Send Email</button>
</form>
EOL

# Create app.js (main app file)
cat <<EOL > app.js
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('./models/user');
const sequelize = require('./config/database');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Create an Express app
const app = express();
app.set('view engine', 'ejs');

// Body parsing middleware
app.use(express.urlencoded({ extended: false }));

// Session management
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport local strategy for user authentication
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await User.findOne({ where: { username } });
    if (!user) return done(null, false, { message: 'Incorrect username.' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return done(null, false, { message: 'Incorrect password.' });
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  const user = await User.findByPk(id);
  done(null, user);
});

// Connect to the database
sequelize.sync();

// Email configuration with Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Routes
app.get('/', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/contacts',
  failureRedirect: '/',
  failureFlash: false
}));

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    await User.create({ username, email, password });
    res.redirect('/');
  } catch (error) {
    res.status(500).send('Error registering user.');
  }
});

// Ensure the user is authenticated before accessing contacts
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

app.get('/contacts', isAuthenticated, (req, res) => {
  res.render('contacts', { user: req.user });
});

// Sending email
app.post('/send-email', isAuthenticated, async (req, res) => {
  const { email, subject, message } = req.body;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      text: message
    });
    res.send('Email sent successfully!');
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to send email.');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on http://localhost:\${PORT}\`);
});
EOL

# Final message
echo "Project scaffolded successfully. You can now run 'node app.js' to start the application!"
