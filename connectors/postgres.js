require('dotenv').config();
// import the knex library that will allow us to
// construct SQL statements
const knex = require('knex');

// define the configuration settings to connect
// to our local postgres server
const config = {
  client: 'pg',
  connection: {
    port: 5432,
    host: process.env.POSTGRES_HOST,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE,
  }
};

// create the connection with postgres
const db = knex(config);

// expose the created connection so we can
// use it in other files to make sql statements
module.exports = db;