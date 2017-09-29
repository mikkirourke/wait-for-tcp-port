# wait-for-tcp-port

Wait for tcp port is a promise based library for waiting for one/more hosts/ports to become available. The ```waitForPort``` function checks only if the ports are opened and  doesn't try to establish connection, that decrease the waiting time. In the library are present two functions for checking the port availability: 
  ```getPortStatusNmap``` - uses nmap utility
  
  ```getPortStatusNc``` - uses netcat utility
  
The default one used in ```waitForPort``` function is ```getPortStatusNc```

## Installation

```bash
npm install --save wait-for-tcp-port
```
## Examples

##### Waiting for a list of hosts/ports to be available

```js
import {waitForPort} from 'wait-for-tcp-port';

const resources = ['example.com:80','example.com:443']

waitForPort({
  resources:resources,
  timeout: 40000
}).then(function(res) {
  console.log('Wait for port result',res)
})
.catch(function(err) {
  console.error(err)
})
```
Output
```
Wait for port result { errors: 0,
  servers: 
   [ { ip: 'example.com', port: '80', tries: 1, status: 'open' },
     { ip: 'example.com', port: '443', tries: 1, status: 'open' } ] }

```
## API
### async waitForPort(options)
 - `options` is an object consisting of
   - `resources` is an array consisting of the list of the ports to check, in the format 'host:port'
   - `timeout` - the maximum time to wait for the open ports in milliseconds. Default value is 120000(2 minutes)
   - `interval` - the interval for scanning the ports in milliseconds. Defalut value is 10000(every 10 seconds)
   - `portStatusFunction` - a custom function to be used for checking the availability.

#### Return value
Returns an object
  - `errors` indicates the number of instances for which errors occurred while scanning the ports
  - `servers` an array of objects corresponding to each instance
    - `ip` the ip or dns of the server.
    - `port` the port checked to be opened.
    - `tries` the number of tries to scan the ports. This field is used in tests.
    - `status` can be 'open' or 'error'.
    - `error`  is the error that occurred. This field is present only if status is 'error'.

If the timeout exceeded an error will be thrown.

### function getPortStatusNmap(ip,port)

 - `ip` the ip or dns of the server.
 - `port` the port to be checked

#### Return value
Returns a resolved promise with the resulting value an object containing:
  - `status` can be 'open','close' or 'error'.
  - `error`  is the error that occurred. This field is present only if status is 'error'.

### function getPortStatusNc(ip,port)

 - `ip` the ip or dns of the server.
 - `port` the port to be checked

#### Return value
Returns a resolved promise with the resulting value an object containing:
  - `status` can be 'open','close' or 'error'
  - `error`  is the error that occurred. This field is present only if status is 'error'.
