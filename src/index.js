import sleep from 'sleep-promise';
import LinodeVpsProvider from './linode-vps-provider';
import {isId, getPortStatus} from './ut';

const vendorMap = {
  linode_vps: LinodeVpsProvider
}

class ServerProvider {
  constructor(vendor, options) {
    const vendorMap = ServerProvider._getVendorMap();
    if(!vendorMap.hasOwnProperty(vendor)) {
      throw new Error('Unknown vendor');
    }
    this._provider = new vendorMap[vendor](options);
  }
  async acquire(count = 1, options = {}) {
    return this._provider.acquire(count, options);
  }

  async list(batchId) {
    return this._provider.list(batchId);
  }

  async release(batchId) {
    return this._provider.release(batchId);
  }

  async releaseOlderThan(minutes) {
    return this._provider.releaseOlderThan(minutes);
  }

  async waitForSshAccess(batchId, options) {
    const o = options || {};
    const timeout = o.timeout || 120 * 1000; //120 seconds
    const interval = o.interval || 10 * 1000; //try every 10 seconds
    const port = o.port || 22;
    const portStatusFunction = o.portStatusFunction || getPortStatus;
    if(!isId(batchId)) {
      throw new Error('Invalid batchId');
    }
    const listResult = await this.list(batchId);
    const ips = new Set();
    for(const server of listResult.servers) {
      ips.add(server.ip);
    }
    const start = Date.now();
    const checkedServers = [];
    let errors = 0;
    let tries = 0;
    while(Date.now() - start <= timeout) {
      if(Date.now() - start > interval / 2)
      {
        await sleep(interval);
      }
      ++tries;
      for(const ip of ips.values()) {
        const res = await portStatusFunction(ip, port);
        if(res.status === 'error') {
          ips.delete(ip);
          checkedServers.push({
            ip,
            tries,
            result: res
          });
          ++errors;
        } else if(res.status === 'open') {
          ips.delete(ip);
          checkedServers.push({
            ip,
            tries,
            result: res
          });
        }
      }
      if(ips.size == 0) {
        return {
          errors,
          servers: checkedServers
        }
      }
    }
    throw new Error('Timeout');
  }

  static _getVendorMap() {
    return vendorMap;
  }
}

export default ServerProvider

