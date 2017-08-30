import * as resources from './linode-vps-fake-resource';
import * as ut from './ut'
import * as utd from '../dist/ut';

const dispatchMap = {
  'linode.create': '_create_linode',
  'linode.delete': '_delete_linode',
  'linode.update': '_update_linode',
  'linode.disk.createfromdistribution': '_create_linode_disk_from_distribution',
  'linode.config.create': '_create_linode_config',
  'linode.boot': '_boot_linode',
  'linode.ip.list': '_linode_ip_list',
  'linode.list': '_linode_list',
  'linode.job.list': '_linode_job_list',
  'avail.linodeplans': '_linode_plans',
  'avail.datacenters': '_linode_data_centers',
  'avail.kernerls': '_linode_kernels',
  'avail.distributions': '_linode_distributions'
};

class Linode {
  constructor(linodeId, planId, datacenterId) {
    this._disks = [];
    this._jobs = [];
    this._ips = [];
    this._configs = [];
    this._addConfigThrow = false;
    this._attributes = {
      TOTALXFER: 1000,
      ALERT_BWQUOTA_ENABLED: 1,
      ALERT_DISKIO_ENABLED: 1,
      DISTRIBUTIONVENDOR: '',
      ALERT_BWOUT_ENABLED: 1,
      ALERT_CPU_THRESHOLD: 90,
      LINODEID: linodeId,
      ALERT_BWOUT_THRESHOLD: 10,
      BACKUPWINDOW: 0,
      DATACENTERID: datacenterId,
      ALERT_BWIN_ENABLED: 1,
      STATUS: 0,
      PLANID: planId,
      LABEL: 'linode3211214',
      ALERT_BWIN_THRESHOLD: 10,
      ALERT_CPU_ENABLED: 1,
      BACKUPSENABLED: 0,
      TOTALRAM: 1024,
      WATCHDOG: 1,
      CREATE_DT: '2017-06-06 09:22:18.0',
      ISKVM: 1,
      ALERT_BWQUOTA_THRESHOLD: 80,
      BACKUPWEEKLYDAY: 0,
      TOTALHD: 20480,
      LPM_DISPLAYGROUP: '',
      ALERT_DISKIO_THRESHOLD: 10000,
      ISXEN: 0
    }
  }

  addIp(ip) {
    this._ips.push(ip);
  }

  getIps() {
    return this._ips;
  }

  setBatchId(batchId) {
    this._attributes.LPM_DISPLAYGROUP = utd.createFullBatchId(batchId);
  }

  addDisk(diskId, label, size, rootPass, rootSSHKey) {
    let currentSize = 0;
    for(const disk of this._disks) {
      currentSize += disk.SIZE;
    }
    if(currentSize + size > this._attributes.TOTALHD) {
      throw new Error('Disk to large.');
    }

    this._disks.push({
      LABEL: label,
      DISKID: diskId,
      SIZE: size,
      rootPass,
      rootSSHKey
    });
  }

  hasDisks() {
    return this._disks.length > 0;
  }

  getDisk(diskId) {
    for(const disk of this._disks) {
      if (diskId === disk.DISKID) {
        return disk;
      }
    }
  }

  validateDisks(diskList) {
    const diskIds = diskList.split(',');
    for(const diskId of diskIds) {
      if(!this.getDisk(parseInt(diskId))) {
        return false;
      }
    }
    return true;
  }
  addConfig(id, kernelId, label, diskList, rootDeviceNum) {
    if(this._addConfigThrow) {
      throw new Error('Adding configuration is prohibited');
    }
    this._configs.push({
      ConfigID: id,
      KenelID: kernelId,
      Label: label,
      DiskList: diskList,
      RootDeviceNum: rootDeviceNum
    });
  }
  addJob(func, time, success, label, message) {
    const jobId = ut.getNextId();
    const job = {
      JOBID: jobId,
      HOST_SUCCESS: '',
      HOST_MESSAGE: '',
      LABEL: label
    };
    setTimeout(function() {
      func();
      job.HOST_MESSAGE = message;
      job.HOST_SUCCESS = success
    }, time);
    this._jobs.push(job);
    return jobId;
  }

  getJobs() {
    const jobs = [];
    for(const job of this._jobs) {
      jobs.push(Object.assign({}, job));
    }
    return jobs;
  }

  getId() {
    return this._attributes.LINODEID;
  }

  getBacthId() {
    return utd.parseFullBatchId(this._attributes.LPM_DISPLAYGROUP).id;
  }

  getConfig(id) {
    for(const config of this._configs) {
      if(config.ConfigID === id) {
        return config;
      }
    }
  }

  setAttribute(options, srcName, destName, typeName = 'string') {
    const t = typeof options[srcName];
    if( t === 'undefined') {
      return;
    }
    if(t !== typeName) {
      throw new Error('Invalid value for ' + srcName);
    }
    this._attributes[destName] = options[srcName];
  }

  update(options) {
    this.setAttribute(options, 'Label', 'LABEL' );
    this.setAttribute(options, 'lpm_displayGroup', 'LPM_DISPLAYGROUP')
  }

  getAttributes() {
    return Object.assign({}, this._attributes);
  }
}

class LinodeVpsStore {
  constructor() {
    this._linodes = new Map();
  }

  addLinode(linode) {
    this._linodes.set(linode.getId(), linode);
    if(this._throwSizeTrigger && this._linodes.size >= this._throwSizeTrigger) {
      linode._addConfigThrow = true;
    }
  }

  getLinodeMap() {
    return this._linodes;
  }

  deleteLinode(linodeId) {
    this._linodes.delete(linodeId);
  }

  setBatchCreationTime(batchId, timestamp) {
    const newBatchId = utd.injectIdTimestamp(batchId, timestamp);

    for(const id of this._linodes.keys()) {
      const linode = this._linodes.get(id);
      if(linode.getBacthId() === batchId) {
        linode.setBatchId(newBatchId);
      }
    }
    return newBatchId;
  }

  setConfigThrow(sizeTrigger) {
    this._throwSizeTrigger = sizeTrigger;
  }
};

class LinodeVpsApiFake {
  constructor(store = new LinodeVpsStore(), options = {}) {
    this._store = store;
    this._waitTime = ut.waitTime({
      linodeList: [1, 5]
    }, 10, 100)
    this._wait = ut.waitFunction(this._waitTime);
  }

  getStore() {
    return this._store;
  }

  call(cmd, options) {
    if (!dispatchMap.hasOwnProperty(cmd)) {
      return Promise.reject(new Error('Invalid method call'));
    }
    return this[dispatchMap[cmd]](options);
  }

  async _create_linode(options) {
    this._wait('createLinode');
    if(!options.DatacenterID) {
      throw new Error('DatacenterID not provided');
    }
    if(!options.PlanID) {
      throw new Error('PlanID not provided');
    }

    if(!resources.getLinodePlanMap().has(options.PlanID)) {
      throw new Error('Invalid PlanID');
    }

    if(!resources.getLinodeDataCenterMap().has(options.DatacenterID)) {
      throw new Error('Invalid DatacenterID');
    }

    const id = ut.getNextId();
    const linode = new Linode(id, options.PlanID, options.DatacenterID);
    linode.addIp({
      ISPUBLIC: 1,
      IPADDRESS: ut.getNextIp(),
    });
    linode.addJob(function() {}, this._wait('creationJob', true), true, 'Linode Initial Configuration')
    this._store.addLinode(linode);
    return {LinodeID: id};
  }

  async _delete_linode(options) {
    await this._wait('deleteLinode', options.LinodeID);
    const linode = this._getLinode(options);
    if(!options.skipChecks) {
      if(linode.hasDisks()) {
        throw new Error('Cannot delete linode with one or more disks.')
      }
    }
    this._store.deleteLinode(linode._attributes.LINODEID);
  }

  async _update_linode(options) {
    await this._wait('updateLinode');
    const linode = this._getLinode(options);
    linode.update(options);
  }

  async _create_linode_disk_from_distribution(options) {
    await this._wait('createLinodeDiskFromDistribution');
    const linode = this._getLinode(options);
    if(!options.Size || !Number.isInteger(options.Size)) {
      throw new Error('invalid or missing Size');
    }

    if(typeof options.Label !== 'string' || !/[a-zA-Z][a-zA-Z0-9_]*/.test(options.Label)) {
      throw new Error('invalid or missing Label');
    }

    const distributionMap = resources.getLinodeDistributionMap();
    if(!distributionMap.has(options.DistributionID)) {
      throw new Error('Invalid or missing DistributionID');
    }
    const diskId = ut.getNextId();
    linode.addDisk(diskId, options.Label, options.Size, options.rootPass, options.rootSSHKey);
    const jobId = linode.addJob(function() {}, this._wait('diskCreationJob', true), true, 'Disk Create From Distribution');
    return {
      DiskID: diskId,
      JobID: jobId
    };
  }

  async _create_linode_config(options) {
    await this._wait('createLinodeConfig');
    const linode = this._getLinode(options);
    const kernels = resources.getLinodeKernelMap();
    if(!kernels.has(options.KernelID)) {
      throw new Error('Missing or invalid KernelID');
    }

    if(typeof options.Label !== 'string' || !options.Label) {
      throw new Error('Missing or invalid Label');
    }

    if(typeof options.DiskList !== 'string' || !linode.validateDisks(options.DiskList)) {
      throw new Error('Missing or invalid DiskList')
    }
    if(typeof options.RootDeviceNum !== 'undefined' && options.RootDeviceNum !== 1) {
      throw new Error('Invalid RootDeviceNum');
    }
    const configId = ut.getNextId();
    linode.addConfig(configId, options.KernelID, options.Label, options.DiskList, options.RootDeviceNum);
    return {
      ConfigID: configId
    };
  }

  async _boot_linode(options) {
    await this._wait('bootLinode');
    const linode = this._getLinode(options);
    const config = linode.getConfig(options.ConfigID);
    if(!config) {
      throw new Error('Missing or invalid ConfigID');
    }
    const jobId = linode.addJob(function() {}, this._wait('bootCreationJob', true), true, 'System boot');
    return {
      JobID: jobId
    };
  }

  async _linode_ip_list(options) {
    await this._wait('linodeIpList');
    const linode = this._getLinode(options);
    return linode.getIps();
  }

  async _linode_list(options) {
    await this._wait('linodeList');
    const result = [];
    const linodes = this._store.getLinodeMap();
    for(const id of linodes.keys()) {
      result.push(linodes.get(id).getAttributes());
    }
    return result;
  }

  _getLinode(options) {
    const linodes = this._store.getLinodeMap();
    if(!linodes.has(options.LinodeID)) {
      throw new Error('Invalid LinodeID');
    }
    return linodes.get(options.LinodeID);
  }

  async _linode_job_list(options) {
    await this._wait('gitLinodeJobList');
    const linode = this._getLinode(options);
    return linode.getJobs();
  }

  async _linode_plans() {
    await this._wait('getAvailablePlans');
    return resources.getLinodePlans();
  }

  async _linode_data_centers() {
    await this._wait('getAvailableDataCenters');
    return resources.getLinodeDataCenters();
  }

  async _linode_kernels() {
    await this._wait('getAvailableKernels');
    return resources.getLinodeKernels();
  }

  async _linode_distributions() {
    await this._wait('getAvailableDistributions');
    return resources.getLinodeDistributions();
  }
}

export default LinodeVpsApiFake;