const environments = {};
console.log('FIRST_LOG__:', process.env);
console.log('SECOND_LOG__:', process.env.PORT);
environments.staging = {
  httpPort: process.env.PORT || 3000,
  httpsPort: process.env.PORT || 3001,
  envName: 'staging',
  hashingSecret: process.env.HASHING_SECRET,
  maxChecks: 5,
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromPhone: process.env.TWILIO_FROM_PHONE,
  },
};

environments.production = {
  httpPort: process.env.PORT || 5000,
  httpsPort: process.env.PORT || 5001,
  envName: 'production',
  hashingSecret: 'h71bsxioymhb1qmpbg9r98i9tl3bn',
  maxChecks: 5,
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromPhone: process.env.TWILIO_FROM_PHONE,
  },
};

const currentEnv =
  typeof process.env.NODE_ENV === 'string'
    ? process.env.NODE_ENV.toLowerCase()
    : '';

const envToExport =
  typeof environments[currentEnv] === 'object'
    ? environments[currentEnv]
    : environments.staging;

module.exports = envToExport;
