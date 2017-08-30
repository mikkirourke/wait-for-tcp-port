import ServerProvider from '../../src';

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

