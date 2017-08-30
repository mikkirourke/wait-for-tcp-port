import ServerProvider from '../dist';
import LinodeVpsApiFake from './linode-vps-api-fake';
import chai from 'chai';

const  expect = chai.expect;

describe('Server provider', function() {
  this.timeout(10000);
  let provider;
  let store;
  let api;

  beforeEach(function () {
    api = new LinodeVpsApiFake();
    store = api.getStore();
    provider = new ServerProvider('linode_vps', {
      auth: 'someKey',
      api
    });
  });

  async function acquire(count, options) {
    return await provider.acquire(count, Object.assign({
      timeout: 1000,
      interval: 2
    }, options || {}));
  }

  it('should correctly wait for ssh to be ready', async function() {
    let portStatus = 'close';
    async function getPortStatus(ip, port) {
      return {status: portStatus};
    };
    const batch = await acquire(2, {name: 'a'});

    setTimeout(function() {
      portStatus = 'open';
    }, 300);
    const res = await provider.waitForSshAccess(batch.batchId, {
      timeout: 1000,
      interval: 5,
      portStatusFunction: getPortStatus
    });

    expect(res.errors).to.equal(0);
    const servers = res.servers;
    expect(servers.length).to.equal(2);
    expect(servers[0].tries > 2).to.equal(true);
    expect(servers[0].tries).to.equal(servers[1].tries);
    expect(servers[0].result).to.deep.equal({status: 'open'});
    expect(servers[1].result).to.deep.equal({status: 'open'});
  });
});
