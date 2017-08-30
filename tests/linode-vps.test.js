import ServerProvider from '../dist';
import * as utd from '../dist/ut';
import LinodeVpsApiFake from './linode-vps-api-fake'
import chai from 'chai';

const  expect = chai.expect;

describe('Linode server provider', function() {
  this.timeout(10000);
  let provider;
  let store;
  let api;

  beforeEach(function() {
    api = new LinodeVpsApiFake();
    store = api.getStore();
    provider = new ServerProvider('linode_vps', {
      auth: 'someKey',
      api,
      instance: {
        name: 'test',
        sshKeys: [{public: 'someSshKey'}]
      }
    });
  });

  async function acquire(count, options) {
    return await provider.acquire(count, Object.assign({
      timeout: 1000,
      interval: 2
    }, options || {}));
  }
  function validateServer(data) {
    const {server,  timeBefore, timeAfter, batchId, name} = data;
    const linode = server.rawInfo.Info;
    const batchObjId = utd.parseFullBatchId(linode.LPM_DISPLAYGROUP);
    expect(linode.LABEL).to.equal(name + '-' + server.id);
    expect(batchId).to.equal(batchObjId.id);
    expect(!!utd.parseBatchId(batchId)).to.equal(true);
    expect(server.ip.startsWith('192.168.')).to.equal(true);
    const createdAt = Date.parse(server.createdAt);

    expect(createdAt >= timeBefore && createdAt <= timeAfter).to.equal(true);
  }

  async function validateBatch(data) {
    const {batch, name, timeBefore, timeAfter, count} = data;
    const {servers, batchId} = batch;

    let listedServers = await provider.list(batchId);
    expect(listedServers.servers.length).to.equal(count);
    for(let i = 0; i < count; ++i) {
      const server = servers[i];
      const listedServer = listedServers.servers[i];
      validateServer({
        server,
        timeBefore,
        timeAfter,
        batchId,
        name
      });
      expect(listedServer.ip).to.equal(server.ip);
      expect(listedServer.id).to.equal(server.id);
    }
  }

  it('successfully acquires and releases a server instance', async function() {
    const timeBefore = Date.now();
    const batch = await acquire(1);
    const list = await provider.list();
    expect(list.servers.length).to.equal(1);
    const timeAfter = Date.now();
    await validateBatch({
      batch, name: 'test', timeBefore, timeAfter, count: 1
    });
    await provider.release(batch.batchId);
    expect((await provider.list()).servers.length).to.equal(0);
  });

  it('successfully creates and releases three batches', async function() {
    const timeBefore = Date.now();
    const batch1 = await acquire(5, {name: 'a'});
    expect((await provider.list()).servers.length).to.equal(5);

    const timeBefore2 = Date.now();
    const batch2 = await acquire(2, {name: 'test'});
    expect((await provider.list()).servers.length).to.equal(7);

    const timeBefore3 = Date.now();
    const batch3 = await acquire(4, {name: 'test-server'});
    expect((await provider.list()).servers.length).to.equal(11);
    const timeAfter = Date.now();

    await validateBatch({batch: batch1, name: 'a', timeBefore, timeAfter: timeBefore2, count: 5});
    await validateBatch({batch: batch2, name: 'test', timeBefore: timeBefore2, timeAfter: timeBefore3, count: 2});
    await validateBatch({batch: batch3, name: 'test-server', timeBefore: timeBefore3, timeAfter, count: 4});

    await provider.release(batch2.batchId);
    await validateBatch({batch: batch1, name: 'a', timeBefore, timeAfter: timeBefore2, count: 5});
    await validateBatch({batch: batch3, name: 'test-server', timeBefore: timeBefore3, timeAfter, count: 4});
    expect((await provider.list()).servers.length).to.equal(9);

    await provider.release(batch1.batchId);
    await validateBatch({batch: batch3, name: 'test-server', timeBefore: timeBefore3, timeAfter, count: 4});
    expect((await provider.list()).servers.length).to.equal(4);

    await provider.release(batch3.batchId);
    expect((await provider.list()).servers.length).to.equal(0);
  });

  it('cleans up if acquire fails', async function() {
    const timeBefore = Date.now();
    const batch1 = await acquire(5, {name: 'a'});
    expect((await provider.list()).servers.length).to.equal(5);

    const timeBefore2 = Date.now();
    const batch2 = await acquire(7, {name: 'test'});
    expect((await provider.list()).servers.length).to.equal(12);

    store.setConfigThrow(15);

    const timeBefore3 = Date.now();
    let failed = false;
    try {
      const batch3 = await acquire(8, {name: 'test-server'});
    } catch(err) {
      failed = true;
    }
    expect(failed).to.equal(true);
    expect((await provider.list()).servers.length).to.equal(12);

    await validateBatch({batch: batch1, name: 'a', timeBefore, timeAfter: timeBefore2, count: 5});
    await validateBatch({batch: batch2, name: 'test', timeBefore: timeBefore2, timeAfter: timeBefore3, count: 7});

  });

  it('correctly destroys servers with releaseOlderThan', async function() {
    const m27 = 27 * 60000;
    const m42 = 42 * 60000;
    const m35 = 35 * 60000;

    function setBatchTimeStamp(batch, timestamp) {
      batch.batchId = store.setBatchCreationTime(batch.batchId, timestamp);
      for(const server of batch.servers) {
        const linode = server.rawInfo.Info;
        linode.LPM_DISPLAYGROUP = utd.createFullBatchId(batch.batchId);
        server.createdAt = new Date(timestamp).toISOString();
      }
    }
    const time1 = Date.now() - m27;
    const batch1 = await acquire(6, {name: 'a'});
    expect((await provider.list()).servers.length).to.equal(6);
    setBatchTimeStamp(batch1, time1);
    const time2 = Date.now() - m42;
    const batch2 = await acquire(8);
    expect((await provider.list()).servers.length).to.equal(14);
    setBatchTimeStamp(batch2, time2);

    const time3 = Date.now() - m35;
    const batch3 = await acquire(3, {name: 'test-server'});
    expect((await provider.list()).servers.length).to.equal(17);
    setBatchTimeStamp(batch3, time3);

    await validateBatch({batch: batch1, name: 'a', timeBefore: time1, timeAfter: time1, count: 6});
    await validateBatch({batch: batch2, name: 'test', timeBefore: time2, timeAfter: time2, count: 8});
    await validateBatch({batch: batch3, name: 'test-server', timeBefore: time3, timeAfter: time3, count: 3});

    await provider.releaseOlderThan(50);

    await validateBatch({batch: batch1, name: 'a', timeBefore: time1, timeAfter: time1, count: 6});
    await validateBatch({batch: batch2, name: 'test', timeBefore: time2, timeAfter: time2, count: 8});
    await validateBatch({batch: batch3, name: 'test-server', timeBefore: time3, timeAfter: time3, count: 3});

    await provider.releaseOlderThan(40);
    expect((await provider.list()).servers.length).to.equal(9);
    await validateBatch({batch: batch1, name: 'a', timeBefore: time1, timeAfter: time1, count: 6});
    await validateBatch({batch: batch3, name: 'test-server', timeBefore: time3, timeAfter: time3, count: 3});

    await provider.releaseOlderThan(30);
    expect((await provider.list()).servers.length).to.equal(6);
    await validateBatch({batch: batch1, name: 'a', timeBefore: time1, timeAfter: time1, count: 6});

    await provider.releaseOlderThan(20);
    expect((await provider.list()).servers.length).to.equal(0);
  });
});