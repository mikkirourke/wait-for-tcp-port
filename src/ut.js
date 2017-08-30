import crypto from 'crypto';
import sleep from 'sleep-promise';
import childProcess from 'child_process';

const exec = childProcess.exec;
const ID_BIN_LEN = 16;
const ID_LEN = ID_BIN_LEN * 2;
const SERVICE_ID = '68a68fd3ccb7f4bf';

const idRegex = /^[0-9a-f]+$/;

const rb = crypto.randomBytes;

function generateId(randLen) {
  const id = rb(randLen);
  return id.toString('hex').toLowerCase();
}

function injectIdTimestamp(id, timestamp) {
  if(!isTimestampedId(id)) {
    throw new Error('Invalid timestamped id');
  }
  if(typeof timestamp === 'undefined') {
    timestamp = Date.now();
  }
  const hexTimestamp = ('000000000000' + timestamp.toString(16)).slice(-12);
  return id.substr(0, ID_LEN - 12) + hexTimestamp;
}

function generateTimestampedId(randLen) {
  const nowHex = ('000000000000' + Date.now().toString(16)).slice(-12);
  return rb(randLen).toString('hex') + nowHex;
}

function generatePassword(len) {
  return rb(len).toString('base64');
}

function generateBatchId() {
  return generateTimestampedId(ID_BIN_LEN - 6);
}

function createFullBatchId(batchId) {
  return ['batch', batchId].join('-');
}

function createFullName(vpsName, batchId) {
  return [vpsName, batchId, SERVICE_ID].join('-');
}

function createUniqueName(name, id) {
  return name + '-' +id;
}

function parseUniqueName(uniqueName) {
  const components = uniqueName.split('-');
  const length = components.length;
  if(length > 1) {
    const name = components.slice(0, length - 1).join('-');
    const id = components[length - 1];
    return {
      name,
      id
    };
  }
  return {
    uniqueName
  }
}


function isId(src) {
  if(typeof src !== 'string' || src.length != ID_LEN) {
    return false;
  }
  return idRegex.test(src);
}

function isTimestampedId(id) {
  if(!isId(id)) {
    return false;
  }
  const t = parseInt(id.slice(-12), 16);
  return t > '1496275200000' && t < Date.now() + 24 * 3600 * 1000;
}

function parseBatchId(batchId) {
  if(isTimestampedId(batchId)) {
    return {
      id: batchId,
      timestamp: parseInt(batchId.slice(-12), 16)
    };
  }
}

function parseFullBatchId(fullBatchId) {
  const components = fullBatchId.split('-');
  const result = parseBatchId(components[1]);
  if(result && components[0] === 'batch') {
    return result;
  }
}


function parseFullVpsName(vpsName) {
  const components = vpsName.split('-');
  const length = components.length;

  let batchId;
  if(length > 1 && components[length - 1] === SERVICE_ID) {
    batchId = isId(components[length - 2], 12) ? components[length - 2] : null;
  }
  if(batchId) {
    const name = components.slice(0, length - 2).join('-');
    return {
      name,
      batchId
    };
  }
  return {
    name: vpsName
  }
}

function getAge(timespan) {
  let diff = timespan;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  diff -=  days * (1000 * 60 * 60 * 24);

  const hours = Math.floor(diff / (1000 * 60 * 60));
  diff -= hours * (1000 * 60 * 60);

  const mins = Math.floor(diff / (1000 * 60));
  diff -= mins * (1000 * 60);

  const seconds = Math.floor(diff / (1000));
  diff -= seconds * (1000);

  let result = '';
  if(days) {
    result += days + ' days, ';
  }

  if(days || hours) {
    result += hours + ' hours, ';
  }
  result += mins + ' minutes, ' + seconds + ' seconds';
  return result;
}

function getPortStatus(ip, port) {
  return new Promise(function(resolve, reject) {
    try {
      const cmd = 'nmap -p ' + port + ' ' + ip +
        ' | grep -E \'' + port + '/tcp\\s*[a-zA-Z]+\\s*ssh\'' +
        ' | awk \'{print $2}\'';
      exec(cmd, function(error, stdout, stderr) {
        if(error) {
          return resolve({
            status: 'error',
            error: error
          });
        }
        return resolve({
          status: stdout.trim()
        });
      });
    } catch(err) {
      return resolve({
        status: 'error',
        error: err
      });
    }
  });
}

async function waitForAsyncFunction(f, timeout, interval) {
  const start = Date.now();
  while(Date.now() - start <= timeout) {
    if(Date.now() - start > interval / 2) {
      await sleep(interval);
    }
    const result = await f();
    if(result) {
      return result;
    }
  }
  throw new Error('Time out');
}


export {
  SERVICE_ID,
  isId,
  generateId,
  generateBatchId,
  parseFullVpsName,
  createFullName,
  createUniqueName,
  getPortStatus,
  waitForAsyncFunction,
  createFullBatchId,
  parseFullBatchId,
  parseBatchId,
  parseUniqueName,
  generatePassword,
  generateTimestampedId,
  getAge,
  injectIdTimestamp
}
