import waitForPort from '../src/index.js';

const resources = ['example.com:80','example.com:443']

waitForPort(resources,{timeout: 40000})
.then(function(res) {
  console.log('Wait for port result',res)
})
.catch(function(err) {
  console.error(err)
})
