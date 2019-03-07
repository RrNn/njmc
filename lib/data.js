/*
 *store and edit data
 */

const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

const lib = {};
// Base dir for the .data folder
lib.baseDir = path.join(__dirname, '/../.data/');

// create a file and write to it

lib.create = (dir, file, data, callback) => {
  // open the file to write to it
  fs.open(
    lib.baseDir + dir + '/' + file + '.json',
    'wx',
    (err, fileDescriptor) => {
      if (!err && fileDescriptor) {
        // convert the data to string, so we can write it to a file
        const stringData = JSON.stringify(data);
        fs.writeFile(fileDescriptor, stringData, (err) => {
          if (!err) {
            fs.close(fileDescriptor, (err) => {
              if (!err) {
                callback(false);
              } else {
                callback('Could not close the file after writing to it');
              }
            });
          } else {
            callback('Could not write to the file!');
          }
        });
      } else {
        callback('Could not create the file. It may already exist');
      }
    }
  );
};

// read an existing file

lib.read = (dir, file, callback) => {
  fs.readFile(lib.baseDir + dir + '/' + file + '.json', 'utf8', (err, data) => {
    if (!err && data) {
      const parsedData = helpers.parseJsonToObject(data);
      callback(false, parsedData);
    } else {
      callback(err, data);
    }
  });
};

// update a file
lib.update = (dir, file, data, callback) => {
  fs.open(
    lib.baseDir + dir + '/' + file + '.json',
    'r+',
    (err, fileDescriptor) => {
      if (!err && fileDescriptor) {
        const stringData = JSON.stringify(data);
        fs.truncate(fileDescriptor, (err) => {
          if (!err) {
            fs.writeFile(fileDescriptor, stringData, (err) => {
              if (!err) {
                fs.close(fileDescriptor, (err) => {
                  if (!err) {
                    callback(false);
                  } else {
                    callback('Error cloding the file');
                  }
                });
              } else {
                callback('Error writing to the existing file');
              }
            });
          } else {
            callback('Error truncatin the file');
          }
        });
      } else {
        callback('Error updating the file. It might not exist yet');
      }
    }
  );
};

// delete file

lib.delete = (dir, file, callback) => {
  fs.unlink(lib.baseDir + dir + '/' + file + '.json', (err) => {
    if (!err) {
      callback(false);
    } else {
      callback('File could not be deleted. It might not exist');
    }
  });
};

// list all the files in a directory.
lib.list = (dir, callback) => {
  fs.readdir(lib.baseDir + dir + '/', (err, data) => {
    if (!err && data && data.length > 0) {
      let trimmedFileNames = [];
      data.forEach((fileName) => {
        trimmedFileNames.push(fileName.replace('.json', ''));
      });
      callback(false, trimmedFileNames);
    } else {
      callback(err, data);
    }
  });
};

module.exports = lib;
