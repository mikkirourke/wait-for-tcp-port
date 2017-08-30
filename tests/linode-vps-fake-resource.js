
const planMap = createMap(getPlanList(), 'PLANID');
const dataCenterMap = createMap(getDataCenterList(), 'DATACENTERID');
const kernelMap = createMap(getKernelList(), 'KERNELID');
const distributionMap = createMap(getDistributionList(), 'DISTRIBUTIONID');

function getLinodePlanMap() {
  return planMap;
}

function getLinodeDataCenterMap() {
  return dataCenterMap;
}

function getLinodeKernelMap() {
  return kernelMap;
}

function getLinodeDistributionMap() {
  return distributionMap;
}

function getLinodePlans() {
  return getPlanList();
}

function getLinodeDataCenters() {
  return getDataCenterList();
}

function getLinodeKernels() {
  return getKernelList();
}

function getLinodeDistributions() {
  return getDistributionList();
}

export {
  getLinodeDataCenterMap,
  getLinodeDataCenters,
  getLinodeKernelMap,
  getLinodeKernels,
  getLinodePlanMap,
  getLinodePlans,
  getLinodeDistributionMap,
  getLinodeDistributions
};

function createMap(objects, field) {
  const result = new Map();
  for(const obj of objects) {
    result.set(obj[field], obj);
  }
  return result;
}

function getDataCenterList() {
  return [
    {LOCATION: 'Dallas, TX, USA', DATACENTERID: 2, ABBR: 'dallas'},
    {
      LOCATION: 'Fremont, CA, USA',
      DATACENTERID: 3,
      ABBR: 'fremont'
    },
    {
      LOCATION: 'Atlanta, GA, USA',
      DATACENTERID: 4,
      ABBR: 'atlanta'
    },
    {LOCATION: 'Newark, NJ, USA', DATACENTERID: 6, ABBR: 'newark'},
    {
      LOCATION: 'London, England, UK',
      DATACENTERID: 7,
      ABBR: 'london'
    },
    {LOCATION: 'Tokyo, JP', DATACENTERID: 8, ABBR: 'tokyo'},
    {LOCATION: 'Singapore, SG', DATACENTERID: 9, ABBR: 'singapore'},
    {
      LOCATION: 'Frankfurt, DE',
      DATACENTERID: 10,
      ABBR: 'frankfurt'
    },
    {LOCATION: 'Tokyo 2, JP', DATACENTERID: 11, ABBR: 'shinagawa1'}]
}

function getKernelList() {
  return [
    { ISKVM: 1,
      KERNELID: 138,
      LABEL: 'Latest 64 bit (4.9.15-x86_64-linode81)',
      ISPVOPS: 1,
      ISXEN: 1 },
    { ISKVM: 1,
      KERNELID: 258,
      LABEL: '4.9.15-x86_64-linode81',
      ISPVOPS: 1,
      ISXEN: 1 },
    { ISKVM: 1,
      KERNELID: 256,
      LABEL: '4.9.7-x86_64-linode80',
      ISPVOPS: 1,
      ISXEN: 1 },
    {
      ISKVM: 1,
      KERNELID: 210,
      LABEL: '3.13.0-x86_64-generic',
      ISPVOPS: 1,
      ISXEN: 1}
  ];
}

function getDistributionList() {
  return [
    {
      CREATE_DT: '2014-07-08 10:07:21.0',
      REQUIRESPVOPSKERNEL: 1,
      LABEL: 'CentOS 7',
      DISTRIBUTIONID: 129,
      MINIMAGESIZE: 1500,
      IS64BIT: 1
    },
    {
      CREATE_DT: '2015-04-27 16:26:41.0',
      REQUIRESPVOPSKERNEL: 1,
      LABEL: 'Debian 8',
      DISTRIBUTIONID: 140,
      MINIMAGESIZE: 1024,
      IS64BIT: 1
    },
    {
      CREATE_DT: '2016-11-28 14:53:47.0',
      REQUIRESPVOPSKERNEL: 1,
      LABEL: 'Fedora 25',
      DISTRIBUTIONID: 155,
      MINIMAGESIZE: 1500,
      IS64BIT: 1
    },
    {
      CREATE_DT: '2016-04-22 14:11:29.0',
      REQUIRESPVOPSKERNEL: 1,
      LABEL: 'Ubuntu 16.04 LTS',
      DISTRIBUTIONID: 146,
      MINIMAGESIZE: 1024,
      IS64BIT: 1
    },
    {
      CREATE_DT: '2014-04-28 15:19:34.0',
      REQUIRESPVOPSKERNEL: 1,
      LABEL: 'CentOS 6.8',
      DISTRIBUTIONID: 127,
      MINIMAGESIZE: 1024,
      IS64BIT: 1
    },
    {
      CREATE_DT: '2014-09-24 13:59:32.0',
      REQUIRESPVOPSKERNEL: 1,
      LABEL: 'Debian 7',
      DISTRIBUTIONID: 130,
      MINIMAGESIZE: 600,
      IS64BIT: 1
    },
    {
      CREATE_DT: '2016-06-22 15:03:38.0',
      REQUIRESPVOPSKERNEL: 1,
      LABEL: 'Fedora 24',
      DISTRIBUTIONID: 149,
      MINIMAGESIZE: 1024,
      IS64BIT: 1
    },
    {
      CREATE_DT: '2014-04-17 15:42:07.0',
      REQUIRESPVOPSKERNEL: 1,
      LABEL: 'Ubuntu 14.04 LTS',
      DISTRIBUTIONID: 124,
      MINIMAGESIZE: 1500,
      IS64BIT: 1
    }
  ];
}

function getPlanList() {
  return [{
    CORES: 1,
    XFER: 1000,
    AVAIL: {
      '2': 500,
      '3': 500,
      '4': 500,
      '6': 500,
      '7': 500,
      '8': 500,
      '9': 500,
      '10': 500,
      '11': 500
    },
    PRICE: 5,
    PLANID: 1,
    LABEL: 'Linode 1024',
    DISK: 20,
    RAM: 1024,
    HOURLY: 0.0075
  },
    {
      CORES: 1,
      XFER: 2000,
      AVAIL: {
        '2': 500,
        '3': 500,
        '4': 500,
        '6': 500,
        '7': 500,
        '8': 500,
        '9': 500,
        '10': 500,
        '11': 500
      },
      PRICE: 10,
      PLANID: 2,
      LABEL: 'Linode 2048',
      DISK: 30,
      RAM: 2048,
      HOURLY: 0.015
    },
    {
      CORES: 2,
      XFER: 3000,
      AVAIL: {
        '2': 500,
        '3': 500,
        '4': 500,
        '6': 500,
        '7': 500,
        '8': 500,
        '9': 500,
        '10': 500,
        '11': 500
      },
      PRICE: 20,
      PLANID: 3,
      LABEL: 'Linode 4096',
      DISK: 48,
      RAM: 4096,
      HOURLY: 0.03
    },
    {
      CORES: 4,
      XFER: 4000,
      AVAIL: {
        '2': 500,
        '3': 500,
        '4': 500,
        '6': 500,
        '7': 500,
        '8': 500,
        '9': 500,
        '10': 500,
        '11': 500
      },
      PRICE: 40,
      PLANID: 4,
      LABEL: 'Linode 8192',
      DISK: 96,
      RAM: 8192,
      HOURLY: 0.06
    },
    {
      CORES: 1,
      XFER: 5000,
      AVAIL: {
        '2': 500,
        '3': 500,
        '4': 500,
        '6': 500,
        '7': 500,
        '8': 500,
        '9': 500,
        '10': 500,
        '11': 500
      },
      PRICE: 60,
      PLANID: 10,
      LABEL: 'Linode 16384',
      DISK: 20,
      RAM: 16384,
      HOURLY: 0.09
    }];
}

