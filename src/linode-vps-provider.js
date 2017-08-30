import linodeApi from 'linode-api';
import merge from 'merge';
import sleep from 'sleep-promise';
import linode from 'linode-api';
import {generateBatchId, createFullBatchId, waitForAsyncFunction, generatePassword,
  parseFullBatchId, parseBatchId, getAge} from './ut';

const sizeMap = {
  '1gb' : 'Linode 1024',
  '2gb' : 'Linode 2048',
  '4gb' : 'Linode 4096',
  '8gb' : 'Linode 8192'
};

const distributionMap = {
  '@ubuntu': 'Ubuntu 16.04 LTS',
  '@ubuntu16': 'Ubuntu 16.04 LTS',
  '@ubuntu14': 'Ubuntu 14.04 LTS',
  '@debian': 'Debian 8',
  '@debian8': 'Debian 8',
  '@debian7': 'Debian 7',
  '@centos': 'CentOS 7',
  '@centos7': 'CentOS 7',
  '@centos6': 'CentOS 6.8',
  '@fedora': 'Fedora 25',
  '@fedora25': 'Fedora 25',
  '@fedora24': 'Fedora 24'
};

function createLinodeApi(apiKey) {
  const linodeClient = new linode.LinodeClient(apiKey);
  return {
    call: function (cmd, options) {
      return new Promise(function(resolve, reject) {
        try {
          linodeClient.call(cmd, options, function(err, res) {
            if(err) {
              return reject(err);
            }
            return resolve(res);
          });
        } catch(err) {
          return reject(err);
        }
      });
    }
  };
}

export default class LinodeVpsProvider {
  constructor(options = {}) {
    const apiKey = options.auth;
    if(typeof apiKey !== 'string') {
      throw new Error('The \'auth\' property is missing or invalid.');
    }
    this._api = options.api || createLinodeApi(apiKey);

    this._defaultInstanceOptions = merge.recursive({
      name: options.name || 'vps',
      dataCenter: 'atlanta',
      size: '1gb',
      distribution: '@Ubuntu14',
      //ssh_keys: [],
      provider: {

      }
    }, options.instance || {});
  }

  async acquire(count = 1, options = {}) {
    const instanceOptions = await this._translateInstanceOptions(merge.recursive(true, this._defaultInstanceOptions, options || {}));
    return await this._createLinodes(count, instanceOptions);
  }

  async list(batchId) {
    const linodeMap = await this._getLinodeMap();
    const linodes = [];
    for(const linodeId of linodeMap.keys()) {
      const info = linodeMap.get(linodeId);
      const batchIdObj = parseFullBatchId(info.LPM_DISPLAYGROUP);
      if(batchIdObj && (!batchId || batchId === batchIdObj.id)) {
        const linode = {
          BatchID: batchIdObj.id,
          LinodeID: info.LINODEID,
          Info: info,
          Timestamp: batchIdObj.timestamp
        }
        linodes.push(linode);
      }
    }
    await this._setNetworkInfo(linodes);
    return this._createResultObject(linodes);
  }

  async release(batchId) {
    if(!parseBatchId(batchId)) {
      throw new Error('Invalid batch id');
    }
    const list = await this.list(batchId);
    let errors = 0;
    const servers = [];
    for(const server of list.servers) {
      try {
        await this._api.call('linode.delete', {
          LinodeID: server.id,
          skipChecks: true
        });
        servers.push({id: server.id, batchId, success: true});
      } catch(err) {
        servers.push({id: server.id, batchId, success: false, error: err});
        ++errors;
      }
    }

    return {
      batchId,
      errors,
      servers
    };
  }

  async releaseOlderThan(minutes) {
    const list = await this.list();
    let errors = 0;
    const servers = [];
    const before = Date.now() - minutes * 60000;
    for(const server of list.servers) {
      if(new Date(server.createdAt).getTime() < before) {
        try {
          await this._api.call('linode.delete', {
            LinodeID: server.id,
            skipChecks: true
          });
          servers.push({id: server.id, batchId: server.batchId, success: true});
        } catch(err) {
          servers.push({id: server.id, batchId: server.batchId, success: false, error: err});
          ++errors;
        }
      }
    }
    return {
      servers,
      errors
    };
  }

  _awaitAll(promises) {
    return new Promise(function(resolve) {
      const values = [];
      const errors = [];
      let count = promises.length;
      if(count === 0) {
        return resolve({values, errors});
      }

      let index = 0;
      function checkAndResolve() {
        --count;

        if(count === 0) {
          resolve({values, errors});
        }
      }

      function handlePromise(promise, index) {
        promise.then(function(value) {
          values[index] = value;
          checkAndResolve();
        }).catch(function(err) {
          errors.push({index, error: err});
          checkAndResolve();
        });
      }

      for(const promise of promises) {
        handlePromise(promise, index);
        ++index;
      }
    });
  }

  _createResultObject(linodes) {
    const servers = [];
    for(const linode of linodes) {
      const batchIdObj = parseBatchId(linode.BatchID);
      const server = {
        id: linode.LinodeID,
        batchId: batchIdObj.id,
        createdAt: new Date(batchIdObj.timestamp).toISOString(),
        age: getAge(Date.now() - batchIdObj.timestamp),
        rawInfo: linode
      };
      const ip = this._findPublicIp(linode);
      if(ip) {
        server.ip = ip.IPADDRESS
      }
      servers.push(server);
    }
    return {
      servers
    }
  }

  async _createLinodes(count, instanceOptions) {
    let creationResult;
    try {

      const timeout = instanceOptions.timeout || 15 * 60 * 1000; //15 minutes
      const interval = instanceOptions.interval || 5000; //5 seconds

      const batchId = generateBatchId();

      const label = instanceOptions.Label || this._defaultInstanceOptions.name;

      //create the linodes
      const creationPromises = [];
      for(let i = 0; i < count; ++i) {
        creationPromises.push(this._api.call('linode.create', {
          DatacenterID: instanceOptions.DatacenterID,
          PlanID: instanceOptions.PlanID
        }));
      }
      creationResult = await this._awaitAll(creationPromises);
      const linodes = creationResult.values;
      if(creationResult.errors.length > 0) {
        throw new Error('Linode batch creation errors: ' + JSON.stringify(creationResult.errors));
      }

      //set the batch ID and label for all linodes
      const updatingPromises = [];
      for(const linode of linodes) {
        linode.BatchID = batchId;
        updatingPromises.push(this._api.call('linode.update', {
          LinodeID: linode.LinodeID,
          Label: label + '-' + linode.LinodeID,
          lpm_displayGroup: createFullBatchId(batchId)
        }));
      }
      const updatingResult = await this._awaitAll(updatingPromises);
      if(updatingResult.errors.length > 0) {
        throw new Error('Linode batch updating errors: ' + JSON.stringify(updatingResult.errors));
      }
      await this._waitForJobsToFinish(linodes, timeout, interval);

      //read additional info and attach it to each linode
      const linodeMap = await this._getLinodeMap();
      for(const linode of linodes) {
        const linodeItem = linodeMap.get(linode.LinodeID);
        if(!linodeItem) {
          throw new Error('Missing linode info.LinodeId: ' + linode.LinodeID);
        }
        linode.Info = linodeItem;
      }

      //read network info and attach it to each linode
      await this._setNetworkInfo(linodes);

      //create disks for all linodes
      const diskCreationPromises = [];
      for(const linode of linodes) {
        const diskOptions = {
          LinodeID: linode.LinodeID,
          Size: linode.Info.TOTALHD,
          rootPass: generatePassword(24),
          Label: 'main',
          DistributionID: instanceOptions.DistributionID,
          rootSSHKey: instanceOptions.rootSSHKey
        };
        diskCreationPromises.push(this._api.call('linode.disk.createfromdistribution', diskOptions));
      }
      const diskCreationResult = await this._awaitAll(diskCreationPromises);
      if(diskCreationResult.errors.length > 0) {
        throw new Error('Linode batch disk creation errors: ' + JSON.stringify(diskCreationResult.errors));
      }

      //create configs for all linodes
      const configCreationPromises = [];
      let index = 0;
      for(const linode of linodes) {
        const configOptions = {
          LinodeID: linode.LinodeID,
          KernelID: instanceOptions.KernelID || 210,
          Label: 'batch-' + batchId,
          DiskList: '' + diskCreationResult.values[index].DiskID,
          RootDeviceNum: 1
        };
        configCreationPromises.push(this._api.call('linode.config.create', configOptions));
        ++index;
      }
      const configCreationResult = await this._awaitAll(configCreationPromises);
      if(configCreationResult.errors.length > 0) {
        throw new Error('Linode batch config creation errors: ' + JSON.stringify(configCreationResult.errors));
      }

      //boot all linodes
      const bootPromises = [];
      index = 0;
      for(const linode of linodes) {
        bootPromises.push(this._api.call('linode.boot', {
          LinodeID: linode.LinodeID,
          ConfigID: configCreationResult.values[index].ConfigID
        }));
        ++index;
      }
      const bootResult = await this._awaitAll(bootPromises);
      if(bootResult.errors.length > 0) {
        throw new Error('Linode batch boot errors: ' + JSON.stringify(configCreationResult.errors));
      }

      //wait for all jobs to finish
      await this._waitForJobsToFinish(linodes, timeout, interval);

      return Object.assign({batchId}, this._createResultObject(linodes));
    } catch(err) {
      if(creationResult) {
        await this._tryDeleteLinodes(creationResult.values);
      }
      throw err;
    }
  }

  async _setNetworkInfo(linodes) {
    const ipReadPromises = [];
    for(const linode of linodes) {
      ipReadPromises.push(this._api.call('linode.ip.list', {
        LinodeID: linode.LinodeID
      }));
    }
    const ipReadResult = await this._awaitAll(ipReadPromises);
    if(ipReadResult.errors.length > 0) {
      throw new Error('Linode batch reading IPs errors: ' + JSON.stringify(ipReadResult.errors));
    }
    let index = 0;
    for(const linode of linodes) {
      linode.IPs = ipReadResult.values[index];
      ++index;
    }
  }

  async _getLinodeMap() {
    const linodeList = await this._api.call('linode.list', {});
    const linodeMap = new Map();
    for(const linodeItem of linodeList) {
      linodeMap.set(linodeItem.LINODEID, linodeItem);
    }
    return linodeMap;
  }


  _findPublicIp(linode) {
    for(const ip of linode.IPs) {
      if(ip.ISPUBLIC) {
        return ip;
      }
    }
  }
  async _waitForJobsToFinish(linodes, timeout = 15 * 60000, interval = 10000) {
    const self = this;
    const result = await waitForAsyncFunction(async function() {
      const promises = [];
      for(const linode of linodes) {
        promises.push(self._api.call('linode.job.list', {
          LinodeID: linode.LinodeID
        }));
      }
      const result = await self._awaitAll(promises);
      if(result.errors.length > 0) {
        return result;
      }

      const errors = [];
      let index = 0;
      let unfinishedCount = 0;
      for(const linode of linodes) {
        const jobs = result.values[index];
        ++index;
        for(const job of jobs) {
          if(job.HOST_SUCCESS === '') {
            ++unfinishedCount;
          } else if(job.HOST_SUCCESS !== 1) {
            errors.push(new Error('Linode job error ' + JSON.toString(job)));
          }
        }
      }
      if(unfinishedCount === 0) {
        return {
          errors: errors
        }
      }
    }, timeout, interval);
    return result;
  }

  async _translateInstanceOptions(options) {
    const providerOptions = options.provider || {};
    const name = options.name;
    const size = sizeMap[options.size.toLowerCase() || '1gb'];
    if(!size) {
      throw new Error('Invalid size');
    }

    const plans = await this._getPlans();
    const planId = this._findResource(plans, 'LABEL', size, 'PLANID');
    if(!planId) {
      throw new Error('Could not translate the size');
    }

    const dataCenter = options.dataCenter || 'atlanta';
    const dataCenters = await this._getDataCenters();
    const dataCenterId = this._findResource(dataCenters, 'ABBR', dataCenter, 'DATACENTERID');

    let sshKey;
    const sshKeys = options.sshKeys || [];
    if(!Array.isArray(sshKeys)) {
      throw new Error('sshKeys must be an array');
    }
    if(sshKeys.length > 1) {
      throw new Error('This provider accepts just one ssh key');
    }
    if(sshKeys.length > 0) {
      sshKey = sshKeys[0].public;
      if(typeof sshKey !== 'string') {
        throw new Error('Invalid ssh key');
      }
    }

    const knownDistribution = distributionMap[options.distribution.toLowerCase()];
    const distribution = knownDistribution || options.distribution;
    const distributions = await this._getDistributions();
    const distributionId = this._findResource(distributions, 'LABEL', distribution, 'DISTRIBUTIONID');

    return merge(true, {
      Label: name,
      PlanID: planId,
      DatacenterID: dataCenterId,
      rootSSHKey: sshKey,
      DistributionID: distributionId
    }, providerOptions);
  }

  async _getPlans() {
    if(!this._plans) {
      this._plans = await this._api.call('avail.linodeplans');
    }
    return this._plans;
  }

  async _getDataCenters() {
    if(!this._dataCenters) {
      this._dataCenters = await this._api.call('avail.datacenters');
    }
    return this._dataCenters;
  }

  async _getKernels() {
    if(!this._kernels) {
      this._kernels = await this._api.call('avail.kernels');
    }
    return this._kernels;
  }

  async _getDistributions() {
    if(!this._distributions) {
      this._distributions = await this._api.call('avail.distributions');
    }
    return this._distributions;
  }

  _findResource(items, field, value, returnField) {
    for(const item of items) {
      if(item[field] === value) {
        return returnField ? item[returnField] : item;
      }
    }
  }

  async _tryDeleteLinodes(linodes) {
    for(const linode of linodes) {
      try {
        await this._api.call('linode.delete', {LinodeID: linode.LinodeID, skipChecks: true});
      } catch(err) {
        // there is nothing we can do here
      }
    }
  }
}