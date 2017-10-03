import sleep from 'sleep-promise';
import childProcess from 'child_process';

const exec = childProcess.exec;

function getPortStatusNmap(ip, port) {
  return new Promise(function(resolve, reject) {
    try {
      const cmd = 'nmap -p ' + port + ' ' + ip +
        ' | grep -E \'' + port + '/tcp\\s*[a-zA-Z]+\'' +
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

function getPortStatusNc(ip, port) {
  return new Promise(function(resolve, reject) {
    try {
      const cmd = 'nc -z -w1 ' + ip + ' ' + port + ';echo $?'
      exec(cmd, function(error, stdout, stderr) {
        if(error) {
          return resolve({
            status: 'error',
            error: error
          });
        } 
        if(Number(stdout.trim()) === 0) {
          return resolve({
            status: 'open'
          });
        } else {
          return resolve({
            status: 'close'
          });
        }
      });
    } catch(err) {
      return resolve({
        status: 'error',
        error: err
      });
    }
  });
}

function getPortStatus(ip,port,utility) {
  let func;
  const method = utility ? utility : 'netcat';
  switch(method) {
    case 'netcat':
      func = getPortStatusNc;
      break;
    case 'nmap':
      func = getPortStatusNmap;
      break;
  }
  return func(ip,port)
}

async function waitForPort(options) {
  const o = options || {};
  const resources = o.resources || [];
  const method = o.method || 'netcat';
  const timeout = o.timeout || 120 * 1000; //120 seconds
  const interval = o.interval || 10 * 1000; //try every 10 seconds
  const portStatusFunction = o.portStatusFunction || getPortStatus;
  const tcpResources = new Set();

  for(const resource of resources) {
    const split = resource.split(':')
    if(split.length !== 2) throw new Error('Invalid resource (host and port) to check. Each resource must have the format:\nhost:port')
    const ip = split[0]
    const port = split[1]
    tcpResources.add({
      ip,
      port
    });
  }
 
  const start = Date.now();
  const checkedServers = [];
  let errors = 0;
  let tries = 0;
  while(Date.now() - start <= timeout) {
    if(Date.now() - start > interval / 2)
    {
      await sleep(interval);
    }
    ++tries;
    for(const resource of tcpResources.values()) {
      const res = await portStatusFunction(resource.ip,resource.port,method);
      if(res.status === 'error') {
        tcpResources.delete(resource);
        checkedServers.push({
          ip: resource.ip,
          port: resource.port,
          tries,
          status: res.status,
          error: res.error
        });
        ++errors;
      } else if(res.status === 'open') {
        tcpResources.delete(resource);
        checkedServers.push({
          ip: resource.ip,
          port: resource.port,
          tries,
          status: res.status
        });
      }
      
    }
    if(tcpResources.size === 0) {
      return {
        errors,
        servers: checkedServers
      }
    }
  }

  const checkedServersString = checkedServers.map(function(item) {return JSON.stringify(item)})
  
  let notAvailableServers = []
  for(const server of tcpResources.values()) {
    server['tries'] = tries
    server['status'] = 'close'
    notAvailableServers.push(JSON.stringify(server))
  }
  
  throw new Error('Timeout of ' + timeout + ' exceded.\nChecked servers:\n' + checkedServersString + '\nNot available servers:\n' + notAvailableServers + '')
}


export default waitForPort 

