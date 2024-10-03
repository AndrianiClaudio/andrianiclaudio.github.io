const { Sequelize } = require('sequelize');

// Create a new Sequelize instance
const sequelize = new Sequelize('cryotek', 'lucky', 'allenamento', {
  host: 'localhost',
  dialect: 'mysql'
});

// Test the connection
sequelize.authenticate()
  .then(() => console.log('Connected to MySQL database.'))
  .catch(err => console.error('Unable to connect to the database:', err));

module.exports = sequelize;
