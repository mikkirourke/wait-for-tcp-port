import ServerProvider from '../../src';
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

