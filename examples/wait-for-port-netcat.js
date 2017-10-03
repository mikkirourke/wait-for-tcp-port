import waitForPort from '../src/index.js'

const resources = ['example.com:80','example.com:443']

waitForPort({
  resources: resources,
  timeout: 40000,
  method: 'netcat'
}).then(function(res) {
  console.log('Wait for port result',res)
})
.catch(function(err) {
  console.error(err)
})
