import waitForPort from '../dist';
import chai from 'chai';

const  expect = chai.expect;

describe('Wait for port', function() {
  this.timeout(10000);

  it('should correctly wait for the port to be ready', async function() {
    let portStatus = 'close';
    async function getPortStatus(ip, port) {
      return {status: portStatus};
    };

    setTimeout(function() {
      portStatus = 'open';
    }, 300);

    const res = await waitForPort(['example.com:80'], {
      timeout: 1000,
      interval: 5,
      portStatusFunction: getPortStatus
    });

    expect(res.errors).to.equal(0);
    const servers = res.servers;
    expect(servers.length).to.equal(1);
    expect(servers[0].tries > 2).to.equal(true);
    expect(servers[0].status).to.equal('open');
  });

  it('should throw an error if the timeout exceded for a single port', async function() {
    try {
      let portStatus = 'close';
      async function getPortStatus(ip, port) {
        return {status: portStatus};
      };

      const res = await waitForPort(['example.com:80'], {
        timeout: 1000,
        interval: 5,
        portStatusFunction: getPortStatus
      });

    expect(false).to.equal(true);
    } catch(err) {
      expect(err).to.exist
    }
  });

  it('should correctly wait for multiple ports', async function() {
    let portStatus = 'close';

    async function getPortStatus(ip, port) {
      return {status: portStatus};
    };

    setTimeout(function() {
      portStatus = 'open';
    }, 300);

    const res = await waitForPort(['example.com:80','example.com:443'], {
      timeout: 1000,
      interval: 5,
      portStatusFunction: getPortStatus
    });

    expect(res.errors).to.equal(0);
    const servers = res.servers;
    expect(servers.length).to.equal(2);
    expect(servers[0].tries > 2).to.equal(true);
    expect(servers[0].status).to.equal('open');
    expect(servers[1].tries > 2).to.equal(true);
    expect(servers[1].status).to.equal('open');
  });

  it('should throw an error if one of the ports is not openned', async function() {
    try {
      let portStatus = 'close';

      async function getPortStatus(ip, port) {
        if(port === '22') return {status: 'close'}
        return {status: portStatus};
      };

      setTimeout(function() {
        portStatus = 'open';
      }, 300);

      const res = await waitForPort(['example.com:80','example.com:22'], {
        timeout: 1000,
        interval: 5,
        portStatusFunction: getPortStatus
      });
      expect(false).to.be.true     
    } catch(err) {
      expect(err).to.exist
    }
  });
});
