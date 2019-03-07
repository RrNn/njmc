const crypto = require('crypto');
const config = require('../config');
const https = require('https');
const querystring = require('querystring');

const helpers = {};

helpers.hash = (str) => {
  if (typeof str === 'string' && str.length > 0) {
    const hash = crypto
      .createHmac('sha256', config.hashingSecret)
      .update(str)
      .digest('hex');
    return hash;
  } else {
    return false;
  }
};

helpers.parseJsonToObject = (str) => {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch (e) {
    console.log(e);
    return {};
  }
};

helpers.createRandomString = (strLength) => {
  strLength = typeof strLength == 'number' && strLength > 0 ? strLength : false;

  if (strLength) {
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let str = '';

    for (let i = 0; i < strLength; i++) {
      let randomCharacter = possibleCharacters.charAt(
        Math.floor(Math.random() * possibleCharacters.length)
      );

      str += randomCharacter;
    }

    return str;
  } else {
    return false;
  }
};

helpers.sendTwilioSms = (phone, msg, callback) => {
  phone =
    typeof phone == 'string' && phone.trim().length == 9 ? phone.trim() : false;
  msg =
    typeof msg == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600
      ? msg.trim()
      : false;

  if (phone && msg) {
    const payload = {
      From: config.twilio.fromPhone,
      To: `+256${phone}`,
      Body: msg,
    };

    // stringify the payload
    const stringPayload = querystring.stringify(payload);
    // config request details
    const requestDetails = {
      protocol: 'https:',
      hostname: 'api.twilio.com',
      method: 'POST',
      path: `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
      auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload),
      },
    };

    // Instantiate the Request Object.
    const req = https.request(requestDetails, (res) => {
      const status = res.statusCode;
      if (status === 200 || status === 201) {
        callback(false);
      } else {
        callback(`STATUS CODE WAS__: ${status}`);
      }
    });
    // bind to the error event so things wonth throw @ runtime
    req.on('error', (err) => {
      callback(err);
    });
    // add the payload to the request
    req.write(stringPayload);
    // end the request
    req.end();
  } else {
    callback(400, { Error: 'Given parameters are missing or invalid' });
  }
};

module.exports = helpers;
