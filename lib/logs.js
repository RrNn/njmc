// library for string and rotating logs :)
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

// initialise the lib container
const lib = {};

// Base dir for the .logs folder
lib.baseDir = path.join(__dirname, '/../.logs/');

// appedn a string to a file, create the file if it does not exist
lib.append = (file, str, callback) => {
  fs.open(lib.baseDir + file + '.log', 'a', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // appned the str to the file and close it
      fs.appendFile(fileDescriptor, str + '\n', (err) => {
        if (!err) {
          fs.close(fileDescriptor, (err) => {
            if (!err) {
              callback(false);
            } else {
              callback('Error closing the file that was being appended');
            }
          });
        } else {
          callback('Error appending the string to the file');
        }
      });
    } else {
      callback('Could not open the filke for appedning');
    }
  });
};

// list all the logs and optionally include all the compressed logs depednig on the first parameter, true/false
lib.list = (includeCompressedLogs, callback) => {
  fs.readdir(lib.baseDir, (err, data) => {
    if (!err && data && data.length > 0) {
      const trimmedFileNames = [];
      data.forEach((fileName) => {
        // add the .log files
        if (fileName.indexOf('.log') > -1) {
          trimmedFileNames.push(fileName.replace('.log', ''));
        }
        // add on the .gz files
        if (fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs) {
          trimmedFileNames.push(fileName.replace('.gz.b64', ''));
        }
        callback(false, trimmedFileNames);
      });
    } else {
      callback(err, data);
    }
  });
};

// compress the contents of one ".log" file into a ".gz.b64" file in the same directory
lib.compress = (logId, newFileId, callback) => {
  const sourceFile = logId + '.log';
  const destFile = newFileId + '.gz.b64';
  // read the sourece file
  fs.readFile(lib.baseDir + sourceFile, 'utf8', (err, inputString) => {
    if (!err && inputString) {
      //compress the data using gzip
      zlib.gzip(inputString, (err, buffer) => {
        if (!err && buffer) {
          // send the new compressed data to the destination file
          fs.open(lib.baseDir + destFile, 'wx', (err, fileDescriptor) => {
            if (!err && fileDescriptor) {
              // write to the destination file
              fs.writeFile(fileDescriptor, buffer.toString('base64'), (err) => {
                if (!err) {
                  //close the destination file
                  fs.close(fileDescriptor, (err) => {
                    if (!err) {
                      callback(false);
                    } else {
                      callback(err);
                    }
                  });
                } else {
                  callback(err);
                }
              });
            } else {
              callback(err);
            }
          });
        } else {
          callback(err);
        }
      });
    } else {
      callback(err);
    }
  });
};

// Decopmress the contents of a .gz.b64 file into a string variable that is redable
lib.decompress = (fileId, callback) => {
  const fileName = fileId + 'gz.64';
  fs.readFile(lib.baseDir, fileName, 'utf8', (err, str) => {
    if (!err && str) {
      // decompress the data
      const inputBuffer = Buffer.from(str, 'base64');
      zlib.unzip(inputBuffer, (err, outputBuffer) => {
        if (!err && outputBuffer) {
          const string = outputBuffer.toString();
          callback(false, string);
        } else {
          callback(err);
        }
      });
    } else {
      callback(err);
    }
  });
};

// truncate alog file
lib.truncate = (logId, callback) => {
  fs.truncate(lib.baseDir + logId + '.log', (err) => {
    if (!err) {
      callback(false);
    } else {
      callback(err);
    }
  });
};

module.exports = lib;
