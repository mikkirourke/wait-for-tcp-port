import ServerProvider from '../../src';

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
