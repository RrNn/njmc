const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');
const url = require('url');
const _data = require('./data');
const helpers = require('./helpers');
const _logs = require('./logs');
const util = require('util');
const debug = util.debuglog('workers');
// For this files logs, run 👇
//NODE_DEBUG=workers nodemon index.js

const workers = {};

// llok up all the cheks and end them to the validator
workers.gatherAllChecks = () => {
  _data.list('checks', (err, checks) => {
    if (!err && checks && checks.length > 0) {
      checks.forEach((check) => {
        // read in the check data, r'mba there is no ".json" on the file name
        _data.read('checks', check, (err, originalCheckData) => {
          if (!err && originalCheckData) {
            // pass the check to the validator and let the validator continue with the process
            workers.validateCheckData(originalCheckData);
          } else {
            debug('Error reading one of the checks data', err);
          }
        });
      });
    } else {
      debug('Error: Could not find any checks to process');
    }
  });
};
// sanity checking the check data
workers.validateCheckData = (originalCheckData) => {
  originalCheckData =
    typeof originalCheckData == 'object' && originalCheckData !== null
      ? originalCheckData
      : {};
  originalCheckData.id =
    typeof originalCheckData.id == 'string' &&
    originalCheckData.id.trim().length == 20
      ? originalCheckData.id.trim()
      : false;
  originalCheckData.userPhone =
    typeof originalCheckData.userPhone == 'string' &&
    originalCheckData.userPhone.trim().length == 10
      ? originalCheckData.userPhone.trim()
      : false;
  originalCheckData.protocol =
    typeof originalCheckData.protocol == 'string' &&
    ['https', 'http'].indexOf(originalCheckData.protocol) > -1
      ? originalCheckData.protocol
      : false;
  originalCheckData.url =
    typeof originalCheckData.url == 'string' &&
    originalCheckData.url.trim().length > 0
      ? originalCheckData.url.trim()
      : false;
  originalCheckData.method =
    typeof originalCheckData.method == 'string' &&
    ['post', 'get', 'put', 'delete'].indexOf(originalCheckData.method) > -1
      ? originalCheckData.method
      : false;
  originalCheckData.successCodes =
    typeof originalCheckData.successCodes == 'object' &&
    originalCheckData.successCodes instanceof Array &&
    originalCheckData.successCodes.length > 0
      ? originalCheckData.successCodes
      : false;
  originalCheckData.timeOutSeconds =
    typeof originalCheckData.timeOutSeconds == 'number' &&
    originalCheckData.timeOutSeconds % 1 == 0 &&
    originalCheckData.timeOutSeconds >= 1 &&
    originalCheckData.timeOutSeconds <= 5
      ? originalCheckData.timeOutSeconds
      : false;
  //set the keys that may not be set if the workers have nerver worked on this check before
  originalCheckData.state =
    typeof originalCheckData.state == 'string' &&
    ['up', 'down'].indexOf(originalCheckData.state) > -1
      ? originalCheckData.state
      : 'down';

  originalCheckData.lastChecked =
    typeof originalCheckData.lastChecked == 'number' &&
    originalCheckData.lastChecked > 0
      ? originalCheckData.lastChecked
      : false;
  // if all the checks pass, pass the data to the next function in the process
  if (
    originalCheckData.id &&
    originalCheckData.userPhone &&
    originalCheckData.protocol &&
    originalCheckData.url &&
    originalCheckData.method &&
    originalCheckData.successCodes &&
    originalCheckData.timeOutSeconds
  ) {
    workers.performCheck(originalCheckData);
  } else {
    debug(
      'Error: One of the checks is not properly formatted, skipped it and continued'
    );
  }
};

// Perform the check, send the originalCheckData and the outcome of the check process to the next step in the process
workers.performCheck = (originalCheckData) => {
  // prepare the intial check outcome
  let checkOutcome = { error: false, responseCode: false };
  // mark that the outcome has not yet been sent
  let outcomeSent = false;
  // parse the hostname and the path out of the originalCheckData
  const parsedUrl = url.parse(
    `${originalCheckData.protocol}://${originalCheckData.url}`,
    true
  );
  const hostName = parsedUrl.hostname;
  const path = parsedUrl.path; //using "path" not "pathname" because we need the queryString
  const requestDetails = {
    protocol: `${originalCheckData.protocol}:`,
    hostname: hostName,
    method: originalCheckData.method.toUpperCase(),
    path,
    timeout: originalCheckData.timeOutSeconds * 1000,
  };

  // instantiate the request object using either http of https accordingly
  const _moduleToUse = originalCheckData.protocol == 'http' ? http : https;

  const req = _moduleToUse.request(requestDetails, (res) => {
    // get the status of the sent request
    const status = res.statusCode;
    // update the checkOut come and pass the data along
    checkOutcome.responseCode = status;
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });
  // bind to the error event so it doesnt throw and terminate the application
  req.on('error', (err) => {
    // update the checkOut come and pass the data along
    checkOutcome.error = {
      error: true,
      value: err,
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });
  // bind to the  timeout event
  req.on('timeout', (err) => {
    // update the checkOut come and pass the data along
    checkOutcome.error = {
      error: true,
      value: 'timeout',
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });
  // end the request / send the request
  req.end();
};
// process the check outcome and update the checkData as needed and trigger an alert to the user if needed
// special logic for accomodating a check that has never been tested before. Dont send alerts for that one
workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
  debug(checkOutcome);
  // decide if the check is considered up/down in its current state
  const state =
    !checkOutcome.error &&
    checkOutcome.responseCode &&
    originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1
      ? 'up'
      : 'down';
  // Decide if an alert is wanted
  let alertWarranted =
    originalCheckData.lastChecked && originalCheckData.state !== state
      ? true
      : false;
  // Log the outcome of the log
  const timeOfCheck = Date.now();
  workers.log(
    originalCheckData,
    checkOutcome,
    state,
    alertWarranted,
    timeOfCheck
  );
  // update the check data
  const newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = timeOfCheck;

  // save the updates
  _data.update('checks', newCheckData.id, newCheckData, (err) => {
    // send hrte check data to the next pahse in the process if there is need
    if (alertWarranted) {
      workers.alertUserToStatusChange(newCheckData);
    } else {
      debug('Check outcome has not changed, no alert needed');
    }
    if (!err) {
    } else {
      debug('Error trying to save updates to one of the checks');
    }
  });
};
// alert the user to a change in their check status
workers.alertUserToStatusChange = (newCheckData) => {
  const msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${
    newCheckData.protocol
  }://${newCheckData.url} is currently ${newCheckData.state}`;

  // we slice(1) in orer to remove the "0", ie, Ugandan numbers
  helpers.sendTwilioSms(newCheckData.userPhone.slice(1), msg, (err) => {
    if (!err) {
      debug(
        'Success: The user was alerted to a status change in their check vis an SMS, ****THE_SENT_MESSAGE_WAS****',
        msg
      );
    } else {
      debug(
        'There was an error sending a message to the user who had a change in the check status change',
        err
      );
    }
  });
};

workers.log = (
  originalCheckData,
  checkOutcome,
  state,
  alertWarranted,
  timeOfCheck
) => {
  //form the log data
  const logData = {
    check: originalCheckData,
    outcome: checkOutcome,
    state,
    alert: alertWarranted,
    time: timeOfCheck,
  };
  //convert the logData to a string
  const logString = JSON.stringify(logData);
  // Determine the name of the log file
  const logIFileName = originalCheckData.id;

  // appedn the log string to the file
  _logs.append(logIFileName, logString, (err) => {
    if (!err) {
      debug('Logging to the file was successful');
    } else {
      debug('Logging to file failed');
    }
  });
};
// timer to execute the checks once per specifi time, for example 30 seconds / 1 minute
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 60);
};
// to rotate / compress the log files.
workers.rotateLogs = () => {
  // list all the none compresses log files in the .logs folder
  _logs.list(false, (err, logs) => {
    if (!err && logs && logs.length > 0) {
      logs.forEach((logName) => {
        // compress the data to a different file.
        const logId = logName.replace('.log', '');
        const newFileId = logId + '-' + Date.now();
        _logs.compress(logId, newFileId, (err) => {
          if (!err) {
            // truncate the log. ie, after moving the contents to the newFile
            _logs.truncate(logId, (err) => {
              if (!err) {
                debug('Successfully truncated the log file');
              } else {
                debug('Error trucating the log file');
              }
            });
          } else {
            debug('Error compressing one of the log files', err);
          }
        });
      });
    } else {
      debug('Error: Could not find any logs to compress');
    }
  });
};
//time to execute the log rotation process once per day
workers.logRotationLoop = () => {
  setInterval(() => {
    workers.rotateLogs();
  }, 1000 * 60 * 60 * 24);
};
// init script
workers.init = () => {
  // Log to the console that workes have been initialised
  console.log('\x1b[33m%s\x1b[0m', 'Background workers are running...');
  // execute all the checks immediately when ths file runs
  workers.gatherAllChecks();
  // create a loop to call the checks later on after a certain interval
  workers.loop();
  // Compress all the logs immediately
  workers.rotateLogs();
  // also call the comression loop
  workers.logRotationLoop();
};

module.exports = workers;
