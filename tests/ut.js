import sleep from 'sleep-promise';

let nextId = 1;
function getNextId() {
  return nextId++;
}

let nextIp = [192, 168, 2, 5];
function getNextIp() {
  const ip = nextIp[0] + '.' + nextIp[1] + '.' + nextIp[2] + '.' + nextIp[3];
  for(let i = 3; i >= 0; --i) {
    const v = ++nextIp[i];
    if(v < 256) {
      return ip;
    }
    nextIp[i] = 0;
  }
  nextIp[0] = 1;
  return ip;
}

function waitTime(waitMap, minWait, maxWait) {
  return function(waitId) {
    let min = minWait;
    let max = maxWait;
    if(waitMap.hasOwnProperty(waitId)) {
      min = waitMap[waitId][0];
      max = waitMap[waitId][1];
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  }
}

function waitFunction(waitTimeFunc) {
  return async function(waitId) {
    await sleep(waitTimeFunc(waitId));
  }
}
export {
  getNextIp,
  getNextId,
  waitTime,
  waitFunction
}
