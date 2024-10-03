const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('./models/user');
const fs = require("fs")
const path = require("path")
const sequelize = require('./config/database');
const csv = require("csv-parser")
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
  const contacts = [];

  // Read the CSV file
  fs.createReadStream(path.join(__dirname, 'resources', 'risultati_moka.csv'))
    .pipe(csv())
    .on('data', (row) => {
      contacts.push(row); // Push each row to contacts array
    })
    .on('end', () => {
      // Group contacts by source
      const contactsBySource = {};

      contacts.forEach(contact => {
        const source = contact.Fonte; // Assuming each contact has a Fonte field
        if (!contactsBySource[source]) {
          contactsBySource[source] = [];
        }
        contactsBySource[source].push(contact);
      });

      // Render the view with the grouped contacts
      res.render('contacts', { user: req.user, contactsBySource });
    })
    .on('error', (error) => {
      console.error('Error reading the CSV file:', error);
      res.status(500).send('Internal Server Error');
    });
});


// Download the file
app.get('/download-csv', (req, res) => {
  const file = path.join(__dirname, 'resources', 'risultati_moka.csv'); // Update the path as necessary
  res.download(file, 'risultati_moka.csv', (err) => {
    if (err) {
      console.error("Error downloading the file:", err);
      res.status(500).send("Error downloading the file.");
    }
  });
});

// Sending email
app.post('/send-email', isAuthenticated, async (req, res) => {
  const { email, subject, message } = req.body;

  try {
    // await transporter.sendMail({
    //   from: process.env.EMAIL_USER,
    //   to: email,
    //   subject: subject,
    //   text: message
    // });
    res.send('Email is not setup yet but all looks work!');
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to send email.');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
