# Server-provider

Server-provider is a promise based library for batch creation of VPS instances on different 
cloud providers. In this version only Linode provider is implemented.

## Installation

```bash
npm install --save server-provider
```

## Examples

##### Creating one or more instances on Linode 


```js
import ServerProvider from 'server-provider';
/*
  usage example:
    babel-node acquire.js 98fc3ff8e5164876ef8bfc47f27bc16cc4a445e71bdf3c724ac4c992e3071c8d 3 'replace this with a public ssh key'
*/

const apiKey = process.argv[2];

let count = parseInt(process.argv[3]);
if(!Number.isInteger(count)) {
  count = 1;
}

let sshKey = process.argv[4];

const provider = new ServerProvider('linode_vps', {
  auth: apiKey,
  instance: {
    name: 'test-server',
    size: '1gb',
    sshKeys: [{public: sshKey}]
  }
});

provider.acquire(count).then(async function(result) {
  await provider.waitForSshAccess(result.batchId);
  console.log('result:', result);
}).catch(function(err) {
  console.error(err);
});
```
Output
```
result: { batchId: '2d797257eb4f8b40116a015c844df3f2',
  servers: 
   [ { id: 3218154,
       batchId: '2d797257eb4f8b40116a015c844df3f2',
       createdAt: '2017-06-07T20:45:20.242Z',
       age: '0 minutes, 46 seconds',
       rawInfo: [Object],
       ip: '45.33.98.19' },
     { id: 3218155,
       batchId: '2d797257eb4f8b40116a015c844df3f2',
       createdAt: '2017-06-07T20:45:20.242Z',
       age: '0 minutes, 46 seconds',
       rawInfo: [Object],
       ip: '74.207.232.171' } ] }
```

##### Listing all instances of a batch
```js
import ServerProvider from 'server-provider';

/*
 usage example:
 babel-node list.js 98fc3ff8e5164876ef8bfc47f27bc16cc4a445e71bdf3c724ac4c992e3071c8d cfa36a57007955b98c5cf54d4ab88cde
 */

const apiKey = process.argv[2];
const batchId = process.argv[3];

const provider = new ServerProvider('linode_vps', {
  auth: apiKey
});

provider.list(batchId).then(function(result) {
  console.log('result:', result);
}).catch(function(err) {
  console.error(err);
});
```

Output
```
result: { servers: 
   [ { id: 3218154,
       batchId: '2d797257eb4f8b40116a015c844df3f2',
       createdAt: '2017-06-07T20:45:20.242Z',
       age: '4 minutes, 13 seconds',
       rawInfo: [Object],
       ip: '45.33.98.19' },
     { id: 3218155,
       batchId: '2d797257eb4f8b40116a015c844df3f2',
       createdAt: '2017-06-07T20:45:20.242Z',
       age: '4 minutes, 13 seconds',
       rawInfo: [Object],
       ip: '74.207.232.171' } ] }
```

##### Destroying all instances of a batch
```js
import ServerProvider from 'server-provider';

/*
 usage example:
 babel-node release.js 98fc3ff8e5164876ef8bfc47f27bc16cc4a445e71bdf3c724ac4c992e3071c8d cfa36a57007955b98c5cf54d4ab88cde
 */

const apiKey = process.argv[2];
const batchId = process.argv[3];

const provider = new ServerProvider('linode_vps', {
  auth: apiKey
});

provider.release(batchId).then(function(result) {
  console.log('result:', result);
}).catch(function(err) {
  console.error(err);
});
```
Output
```
result: { batchId: '2d797257eb4f8b40116a015c844df3f2',
  errors: 0,
  servers: 
   [ { id: 3218154,
       batchId: '2d797257eb4f8b40116a015c844df3f2',
       success: true },
     { id: 3218155,
       batchId: '2d797257eb4f8b40116a015c844df3f2',
       success: true } ] }
```
##### Destroying all instances older than N minutes 
```js
import ServerProvider from 'server-provider';

/*
 usage example:
   babel-node release-older-than.js 98fc3ff8e5164876ef8bfc47f27bc16cc4a445e71bdf3c724ac4c992e3071c8d 30
 */

const apiKey = process.argv[2];
let time = parseInt(process.argv[3]);
if(!Number.isInteger(time)) {
  time = 180;
}

const provider = new ServerProvider('linode_vps', {
  auth: apiKey
});

provider.releaseOlderThan(time).then(function(result) {
  console.log('result:', result);
}).catch(function(err) {
  console.error(err);
});
```
Output
```
result: { servers: 
   [ { id: 3218170,
       batchId: '10ff8ede8757cf029f8e015c8454646d',
       success: true },
     { id: 3218171,
       batchId: '10ff8ede8757cf029f8e015c8454646d',
       success: true } ],
  errors: 0 }
```
## API

### new ServerProvider(vendor, options)

 - `vendor` is the id of the cloud provider. In this version only the 'linode_vps' value is valid.
 - `options` is a set of options some of which are vendor specific.
   - `auth` is the vendor specific authentication credentials. For Linode is required and is a string representing a Linode API key. 
   - `instance` is an object with default options for new server instances.  
      - `name` is the name prefix for new instances. The default is `'vps'`.
      - `dataCenter` is the data center or region for the created servers 
      - `size` is the RAM of the new servers. One of: '1gb', '2gb', '4gb', '8gb' ...
      - `distribution` the OS distribution to be installed on the new instances. If the value is one of special values it will be translated first to 
        the vendor specific distribution name, otherwise it will be passed to the vendor API as is. Special values: 
          - '@ubuntu' - the preferred Ubuntu version for this vendor
          - '@ubuntu16' - Ubuntu 16.04 LTS
          - '@ubuntu14' - Ubuntu 14.04 LTS
          - '@debian'
          - '@debian8'
          - '@debian7'
          - '@centos'
          - '@centos7'
          - '@centos6'
          - '@fedora'
          - '@fedora25'
          - '@fedora24'
      - `provider` is an object representing provider specific options 
           
   - `api` is an object with an alternative implementation. This is mainly for unit testing.

### async ServerProvider.prototype.acquire(count[, options])
It acquires one or more servers.
 - `count` is the number of instances to acquire. It defaults to 1 
 - `options` is the set of options for each instance. These values overwrite the corresponding values
   of instance options passed to the ServerProvider constructor.

##### Return value
 - `batchId` is an id to reference this set of instances in other API calls.
 - `servers` is an array of objects 
    - `id` is the id of the instance
    - `ip` is the ip of the instance
    - `rawInfo` is vendor specific info about the servers.
   
### async ServerProvider.prototype.list([batchId])
Queries the vendor API to get the needed list of servers
- `batchId` is the id of the batch to list. If `batchId` is missing all the servers created with this API will be returned.

##### Return value
An object.
- `servers` - an array of objects
  - `id` the id of the instance
  - `ip` the ip of the instance
  - `batchId` the batch id this instance belongs to
  - `createdAt` a string representing the date the batch has been created
  - `age` a string describing how old the batch is. 
  - `rawInfo` is vendor specific information about the server
  
### async ServerProvider.prototype.release(batchId)
Releases the instances of a batch
- `batchId` is the id of the batch to release.

##### Return value
Returns an object 
  - `errors` indicates the number of instances for which errors occurred while releasing
  - `servers` an array of objects corresponding to each instance in the batch
    - `id` is the id of the instance
    - `batchId` is the id of the batch the server belongs to
    - `success` is true if the instance has been released successfully, otherwise is false
    - `error` is the error occurred while trying to release the instance
### async ServerProvider.prototype.releaseOlderThan(timeInMinutes)
Releases all instances created with this API which are older than the time provided in minutes.

##### Return value
Returns an object 
  - `errors` indicates the number of instances for which errors occurred while releasing
  - `servers` an array of objects corresponding to each instance in the batch
    - `id` is the id of the instance
    - `batchId` is the id of the batch the server belongs to
    - `success` is true if the instance has been released successfully, otherwise is false
    - `error` is the error occurred while trying to release the instance
    
### async ServerProvider.prototype.waitForSshAccess(batchId, options)
Waits for ssh ports to be opened. It assumes nmap, grep and awk are installed in your system.
- `batchId` is the id of the batch to release.
- `port` is the port to scan. Default is 22.
- `options.timeout` is timeout value in milliseconds. Default value is 120000(2 minutes).
- `options.interval` is the interval in milliseconds for scanning the port. Default value is 10000(every 10 seconds).

##### Return value
Returns an object 
  - `errors` indicates the number of instances for which errors occurred while scanning ssh ports
  - `servers` an array of objects corresponding to each instance in the batch
    - `status` is 'open', 'close', 'filtered' or 'error'.
    - `error` is the error occurred. This field is present only if status is 'error'.
    - `tries` the number of tries to scan the ports. This field is used in tests.
    
