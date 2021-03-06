# wait-for-tcp-port

Wait for tcp port is a promise based library for waiting for one/more hosts/ports to become available. The ```waitForPort``` function checks only if the ports are opened and  doesn't try to establish connection, that decrease the waiting time. By default it uses netcat utility for network discovery.

## Installation

```bash
npm install --save wait-for-tcp-port
```
## Examples

##### Waiting for a list of hosts/ports to be available

```js
import waitForPort from 'wait-for-tcp-port';

const resources = ['example.com:80','example.com:443']

waitForPort({
  resources:resources,
  timeout: 40000,
  method: 'nmap'
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
   - `method` - the utility used for checking the port status. Available values are : 'netcat','nmap'. If not specified, the netcat utility will be used by default.
   - `portStatusFunction` - a custom function to be used for checking the availability of the ports.

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
