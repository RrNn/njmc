const fs = require('fs');
// Read the .env file and get the variables.
// This is the first thing to do in order to
// make the Environment variables defined in
// all subsequent files. This is why we read
// the .env file immediately we run the entry
// file "index.js" into our application.
// const envVariables = fs.readFileSync('./.env');
// const parsedEnvVariables = envVariables.toString().split('\n');
// parsedEnvVariables.forEach((envVar) => eval(`process.env.${envVar}`));

const server = require('./lib/server');
const workers = require('./lib/workers');

// declare the app
const app = {};

// init the app
app.init = () => {
  // start the server
  server.init();
  // start the workers
  workers.init();
};

// execute
app.init();

module.exports = app;
