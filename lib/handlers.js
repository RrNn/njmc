const _data = require('./data');
const helpers = require('./helpers');
const config = require('../config');

const handlers = {};

handlers.ping = (data, callback) => {
  callback(200);
};

handlers.notFound = (data, callback) => {
  callback(404);
};

// ===================USERS=====================USERS=======================USERS======================== //

// USERS.

handlers.users = (data, callback) => {
  let acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

handlers._users = {};

handlers._users.post = (data, callback) => {
  const firstName =
    typeof data.payload.firstName === 'string' &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;

  const lastName =
    typeof data.payload.lastName === 'string' &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;

  const phone =
    typeof data.payload.phone === 'string' &&
    data.payload.phone.trim().length === 10
      ? data.payload.phone.trim()
      : false;

  const password =
    typeof data.payload.password === 'string' &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;

  const agreement =
    typeof data.payload.agreement === 'boolean' &&
    data.payload.agreement === true
      ? true
      : false;

  if (firstName && lastName && phone && password && agreement) {
    // check whether the user already exists before adding them
    _data.read('users', phone, (err, data) => {
      if (err) {
        // we wanna hash the password before anything else
        const hashedPassword = helpers.hash(password);

        if (hashedPassword) {
          const userObj = {
            firstName,
            lastName,
            phone,
            password: hashedPassword,
            agreement: true,
          };

          _data.create('users', phone, userObj, (err) => {
            if (!err) {
              callback(201);
            } else {
              console.log(err);
              callback(500, { error: 'Could not create the new user' });
            }
          });
        } else {
          callback(500, { error: 'Could not hash the users password' });
        }
      } else {
        callback(400, { error: 'Phone number already exists' });
      }
    });
  } else {
    callback(400, { error: 'Missing required fields' });
  }
};

handlers._users.get = (data, callback) => {
  const phone =
    typeof data.queryStringObject.phone === 'string' &&
    data.queryStringObject.phone.trim().length === 10
      ? data.queryStringObject.phone.trim()
      : false;

  if (phone) {
    const token =
      typeof data.headers.token === 'string' ? data.headers.token : false;

    handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
        _data.read('users', phone, (err, data) => {
          if (!err && data) {
            // remove the password before returning the user details
            delete data.password, callback(200, data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, {
          error: 'The token is missing in the headers or it is invalid',
        });
      }
    });
  } else {
    callback(400, { error: 'Missing required field not provided' });
  }
};

handlers._users.put = (data, callback) => {
  const phone =
    typeof data.payload.phone === 'string' &&
    data.payload.phone.trim().length === 10
      ? data.payload.phone.trim()
      : false;

  const firstName =
    typeof data.payload.firstName === 'string' &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;

  const lastName =
    typeof data.payload.lastName === 'string' &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;

  const password =
    typeof data.payload.password === 'string' &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;

  if (phone) {
    if (firstName || lastName || password) {
      const token =
        typeof data.headers.token === 'string' ? data.headers.token : false;

      handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
        if (tokenIsValid) {
          _data.read('users', phone, (err, userData) => {
            if (!err && userData) {
              if (firstName) {
                userData.firstName = firstName;
              }
              if (lastName) {
                userData.lastName = lastName;
              }
              if (password) {
                userData.password = helpers.hash(password);
              }
              _data.update('users', phone, userData, (err) => {
                if (!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500, { error: 'Could not update the user' });
                }
              });
            } else {
              callback(400, { error: 'The specified user does not exist' });
            }
          });
        } else {
          callback(403, {
            error: 'The token is missing in the headers or it is invalid',
          });
        }
      });
    } else {
      callback(400, { error: 'Missing field to update' });
    }
  } else {
    callback(400, { error: 'Missing required field' });
  }
};

handlers._users.delete = (data, callback) => {
  const phone =
    typeof data.queryStringObject.phone === 'string' &&
    data.queryStringObject.phone.trim().length === 10
      ? data.queryStringObject.phone.trim()
      : false;

  if (phone) {
    const token =
      typeof data.headers.token === 'string' ? data.headers.token : false;

    handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
        _data.read('users', phone, (err, userData) => {
          if (!err && userData) {
            _data.delete('users', phone, (err) => {
              if (!err) {
                const userChecks =
                  typeof userData.checks === 'object' &&
                  userData.checks instanceof Array
                    ? userData.checks
                    : [];
                const checksToDelete = userChecks.length;
                if (checksToDelete > 0) {
                  let checksDeleted = 0;
                  let deletionErrors = false;
                  // loop the checks deleting
                  userChecks.forEach((checkId) => {
                    _data.delete('checks', checkId, (err) => {
                      if (err) {
                        deletionErrors = true;
                      }
                      checksDeleted++;
                      if (checksDeleted === checksToDelete) {
                        if (!deletionErrors) {
                          callback(200);
                        } else {
                          callback(500, {
                            Error:
                              'Errors encountered attempting to delete all of the users checks. All cheks may not have been deleted from the system successfully',
                          });
                        }
                      }
                    });
                  });
                } else {
                  callback(200);
                }
                // callback(200);
              } else {
                callback(500, { error: 'Could not delete the user' });
              }
            });
          } else {
            callback(400, { error: 'Could not find the user' });
          }
        });
      } else {
        callback(403, {
          error: 'The token is missing in the headers or it is invalid',
        });
      }
    });
  } else {
    callback(400, { error: 'Missing required field not provided' });
  }
};

// ==================TOKENS====================TOKENS======================TOKENS======================= //

// TOKENS.

handlers.tokens = (data, callback) => {
  let acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

handlers._tokens = {};

handlers._tokens.post = (data, callback) => {
  const phone =
    typeof data.payload.phone === 'string' &&
    data.payload.phone.trim().length === 10
      ? data.payload.phone.trim()
      : false;

  const password =
    typeof data.payload.password === 'string' &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;

  if (phone && password) {
    // look up the user who matches the phone number
    _data.read('users', phone, (err, userData) => {
      if (!err && userData) {
        // hash the sent passwrod to compare it to the password on the
        // retrieved userData object.
        const hashedPassword = helpers.hash(password);
        if (hashedPassword === userData.password) {
          // if everything is fine, create a token and set expiration time.
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;

          if (tokenId) {
            const tokenObj = {
              phone,
              id: tokenId,
              expires,
            };

            _data.create('tokens', tokenId, tokenObj, (err) => {
              if (!err) {
                callback(201, tokenObj);
              } else {
                callback(500, { error: 'Could not create the new token' });
              }
            });
          } else {
            callback(500, { error: 'Could not generate secure token' });
          }
        } else {
          callback(400, {
            error: 'Password did not match the specified users password',
          });
        }
      } else {
        callback(400, { error: 'Could not find the specified user' });
      }
    });
  } else {
    callback(400, { error: 'Mossing required fields' });
  }
};

handlers._tokens.get = (data, callback) => {
  const id =
    typeof data.queryStringObject.id === 'string' &&
    data.queryStringObject.id.trim().length === 20
      ? data.queryStringObject.id.trim()
      : false;

  if (id) {
    _data.read('tokens', id, (err, tokenData) => {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { error: 'Missing required field not provided' });
  }
};

// we dont update the token, we just extend the expiration time, and this is also
// only possible if the token is still valid, ie, not expired.
handlers._tokens.put = (data, callback) => {
  const id =
    typeof data.payload.id === 'string' && data.payload.id.trim().length === 20
      ? data.payload.id.trim()
      : false;
  const extend =
    typeof data.payload.extend === 'boolean' && data.payload.extend === true
      ? true
      : false;

  if (id && extend) {
    _data.read('tokens', id, (err, tokenData) => {
      if (!err && tokenData) {
        if (tokenData.expires > Date.now()) {
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          _data.update('tokens', id, tokenData, (err) => {
            if (!err) {
              callback(200);
            } else {
              callback(500, {
                error: "Could not update the token's espiration",
              });
            }
          });
        } else {
          callback(401, {
            error: 'The token has already expired and cannot be extended :)',
          });
        }
      } else {
        callback(400, { error: 'Specified token does not exist' });
      }
    });
  } else {
    callback(400, {
      error: 'Missing required field(s) or field(s) are invalid',
    });
  }
};

handlers._tokens.delete = (data, callback) => {
  const id =
    typeof data.queryStringObject.id === 'string' &&
    data.queryStringObject.id.trim().length === 20
      ? data.queryStringObject.id.trim()
      : false;

  if (id) {
    _data.read('tokens', id, (err, data) => {
      if (!err && data) {
        _data.delete('tokens', id, (err) => {
          if (!err) {
            callback(200);
          } else {
            callback(500, { error: 'Could not delete the token' });
          }
        });
      } else {
        callback(400, { error: 'Could not find the token' });
      }
    });
  } else {
    callback(400, { error: 'Missing required field not provided' });
  }
};

handlers._tokens.verifyToken = (id, phone, callback) => {
  _data.read('tokens', id, (err, tokenData) => {
    if (!err && tokenData) {
      if (tokenData.phone === phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

// ==================CHECKS====================CHECKS======================CHECKS======================= //

// CHECKS

handlers.checks = (data, callback) => {
  let acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }
};

handlers._checks = {};

handlers._checks.post = (data, callback) => {
  const protocol =
    typeof data.payload.protocol === 'string' &&
    ['http', 'https'].indexOf(data.payload.protocol) > -1
      ? data.payload.protocol
      : false;
  const url =
    typeof data.payload.url === 'string' && data.payload.url.trim().length > 0
      ? data.payload.url.trim()
      : false;
  const method =
    typeof data.payload.method === 'string' &&
    ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1
      ? data.payload.method
      : false;

  const successCodes =
    typeof data.payload.successCodes === 'object' &&
    data.payload.successCodes instanceof Array &&
    data.payload.successCodes.length > 0
      ? data.payload.successCodes
      : false;

  const timeOutSeconds =
    typeof data.payload.timeOutSeconds === 'number' &&
    data.payload.timeOutSeconds % 1 === 0 &&
    data.payload.timeOutSeconds >= 1 &&
    data.payload.timeOutSeconds <= 5
      ? data.payload.timeOutSeconds
      : false;

  if (protocol && url && method && successCodes && timeOutSeconds) {
    const token =
      typeof data.headers.token === 'string' ? data.headers.token : false;

    _data.read('tokens', token, (err, tokenData) => {
      if (!err && tokenData) {
        const userPhone = tokenData.phone;

        _data.read('users', userPhone, (err, userData) => {
          if (!err && userData) {
            const userChecks =
              typeof userData.checks === 'object' &&
              userData.checks instanceof Array
                ? userData.checks
                : [];

            if (userChecks.length < config.maxChecks) {
              // create random id for the check
              const checkId = helpers.createRandomString(20);
              // create the check objectand include the user's phone
              const checkObj = {
                id: checkId,
                userPhone,
                protocol,
                url,
                method,
                successCodes,
                timeOutSeconds,
              };
              // save the new check object
              _data.create('checks', checkId, checkObj, (err) => {
                if (!err) {
                  // add the chec id to the users object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  // save the new user data
                  _data.update('users', userPhone, userData, (err) => {
                    if (!err) {
                      // return the data about thenew check
                      callback(201, checkObj);
                    } else {
                      callback(500, {
                        error: 'Could not update the user with the new check',
                      });
                    }
                  });
                } else {
                  callback(500, { error: ' Could not create the new check' });
                }
              });
            } else {
              callback(400, {
                error:
                  'The user has the maximum number of checks (' +
                  config.maxChecks +
                  ')',
              });
            }
          } else {
            callback(403);
          }
        });
      } else {
        callback(403);
      }
    });
  } else {
    callback(400, { error: 'Missing required inputs or inputs are invalid' });
  }
};

handlers._checks.get = (data, callback) => {
  const id =
    typeof data.queryStringObject.id === 'string' &&
    data.queryStringObject.id.trim().length === 20
      ? data.queryStringObject.id.trim()
      : false;

  if (id) {
    // look up the check
    _data.read('checks', id, (err, checkData) => {
      if (!err && checkData) {
        // get the token from the headers
        const token =
          typeof data.headers.token === 'string' ? data.headers.token : false;
        // verify that the token is valid and belongs to the user who created the check.
        handlers._tokens.verifyToken(
          token,
          checkData.userPhone,
          (tokenIsValid) => {
            if (tokenIsValid) {
              callback(200, checkData);
            } else {
              callback(403);
            }
          }
        );
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { error: 'Missing required field not provided' });
  }
};

handlers._checks.put = (data, callback) => {
  const id =
    typeof data.payload.id === 'string' && data.payload.id.trim().length === 20
      ? data.payload.id.trim()
      : false;

  const protocol =
    typeof data.payload.protocol === 'string' &&
    ['http', 'https'].indexOf(data.payload.protocol) > -1
      ? data.payload.protocol
      : false;
  const url =
    typeof data.payload.url === 'string' && data.payload.url.trim().length > 0
      ? data.payload.url.trim()
      : false;
  const method =
    typeof data.payload.method === 'string' &&
    ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1
      ? data.payload.method
      : false;

  const successCodes =
    typeof data.payload.successCodes === 'object' &&
    data.payload.successCodes instanceof Array &&
    data.payload.successCodes.length > 0
      ? data.payload.successCodes
      : false;

  const timeOutSeconds =
    typeof data.payload.timeOutSeconds === 'number' &&
    data.payload.timeOutSeconds % 1 === 0 &&
    data.payload.timeOutSeconds >= 1 &&
    data.payload.timeOutSeconds <= 5
      ? data.payload.timeOutSeconds
      : false;

  // check to make sure the id is valid
  if (id) {
    // make sure one or more fields to update has been sent
    if (protocol || url || method || successCodes || timeOutSeconds) {
      // look up the checks
      _data.read('checks', id, (err, checkData) => {
        if (!err && checkData) {
          // get the token from the headers
          const token =
            typeof data.headers.token === 'string' ? data.headers.token : false;
          // verify that the token is valid and belongs to the user who created the check.
          handlers._tokens.verifyToken(
            token,
            checkData.userPhone,
            (tokenIsValid) => {
              if (tokenIsValid) {
                // update the check where necessary.
                if (protocol) {
                  checkData.protocol = protocol;
                }

                if (url) {
                  checkData.url = url;
                }

                if (method) {
                  checkData.method = method;
                }

                if (successCodes) {
                  checkData.successCodes = successCodes;
                }

                if (timeOutSeconds) {
                  checkData.timeOutSeconds = timeOutSeconds;
                }

                _data.update('checks', id, checkData, (err) => {
                  if (!err) {
                    callback(200);
                  } else {
                    callback(500, { error: 'Could not update the check' });
                  }
                });
              } else {
                callback(403);
              }
            }
          );
        } else {
          callback(400, { error: 'Check ID does not exist' });
        }
      });
    } else {
      callback(400, { error: 'Missing fields to update' });
    }
  } else {
    callback(400, { error: 'Missing required field' });
  }
};

handlers._checks.delete = (data, callback) => {
  // chech whether the id is valid
  const id =
    typeof data.queryStringObject.id === 'string' &&
    data.queryStringObject.id.trim().length === 20
      ? data.queryStringObject.id.trim()
      : false;

  if (id) {
    // find out whether the check for deleting exists
    _data.read('checks', id, (err, checkData) => {
      if (!err && checkData) {
        const token =
          typeof data.headers.token === 'string' ? data.headers.token : false;

        handlers._tokens.verifyToken(
          token,
          checkData.userPhone,
          (tokenIsValid) => {
            if (tokenIsValid) {
              _data.delete('checks', id, (err) => {
                if (!err) {
                  _data.read('users', checkData.userPhone, (err, userData) => {
                    if (!err && userData) {
                      const userChecks =
                        typeof userData.checks === 'object' &&
                        userData.checks instanceof Array
                          ? userData.checks
                          : [];
                      // remove the deleted check from the list of checks on the user object
                      const checksPosition = userChecks.indexOf(id);
                      if (checksPosition > -1) {
                        userChecks.splice(checksPosition, 1);
                        // after removing the check from the users object, then we re-save the users object
                        _data.update(
                          'users',
                          checkData.userPhone,
                          userData,
                          (err) => {
                            if (!err) {
                              callback(200);
                            } else {
                              callback(500, {
                                error: 'Could not update the user ',
                              });
                            }
                          }
                        );
                      } else {
                        callback(500, {
                          Error:
                            'Could not find the check on the users object, so could not delete it from the object',
                        });
                      }
                    } else {
                      callback(400, {
                        error:
                          'Could not find the user who created this check, so could not delete the check from the user object',
                      });
                    }
                  });
                } else {
                  callback(500, { Error: 'Could not delete the check data' });
                }
              });
            } else {
              callback(403, {
                error: 'The token is missing in the headers or it is invalid',
              });
            }
          }
        );
      } else {
        callback(404, { Error: 'The check ID could not be found' });
      }
    });
  } else {
    callback(400, { error: 'Missing required field not provided' });
  }
};

module.exports = handlers;
