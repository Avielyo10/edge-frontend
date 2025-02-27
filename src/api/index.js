import {
  statusMapper,
  deviceSummaryMapper,
  inventoryFields,
} from '../constants';
import { instance } from '@redhat-cloud-services/frontend-components-utilities/interceptors/interceptors';
import { HostsApi } from '@redhat-cloud-services/host-inventory-client';
import { generateFilter } from '@redhat-cloud-services/frontend-components-utilities/helpers';

const IMAGE_BUILDER_API = '/api/image-builder/v1';
const EDGE_API = '/api/edge/v1';
const randomNumber = (min, max) =>
  Math.round(Math.random() * (max - min) + min);
const randomString = () => Math.random().toString(36).substr(2, 10);
// const randomBool = () => Boolean(Math.round(Math.random() * 10) % 2);
const randomDate = (offset = 10000000000) =>
  new Date(+new Date() - Math.floor(Math.random() * offset));

const randomUUID = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c == 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

const randomStatus = () =>
  statusMapper[randomNumber(0, statusMapper.length - 1)];

const rowGroupCreator = (uuid, name, sensors, isSecure, lastSeen) => ({
  uuid,
  name,
  sensors,
  is_secure: isSecure,
  last_seen: lastSeen,
  status: randomStatus(),
});

const rowGroupDetailCreator = (uuid, version, status) => {
  return {
    uuid,
    version,
    status,
  };
};

const getTableParams = (q) => {
  const query = Object.keys(q).reduce((acc, curr) => {
    let value = undefined;
    if (
      typeof q[curr] === 'object' &&
      typeof q[curr].length === 'number' &&
      q[curr].length > 0
    ) {
      value = q[curr].reduce(
        (multiVals, val) =>
          multiVals === '' ? `${curr}=${val}` : `${multiVals}&${curr}=${val}`,
        ''
      );
    }
    if (['string', 'number'].includes(typeof q[curr]) && q[curr] !== '') {
      value = `${curr}=${q[curr]}`;
    }
    return value === undefined
      ? acc
      : acc === ''
      ? `${value}`
      : `${acc}&${value}`;
  }, '');

  return query;
};

const groups = [];

export const fetchGroups = ({ perPage, page }) => {
  const currPage = page || 1;
  const currPerPage = perPage || 20;
  return insights.chrome.auth.getUser().then(() => ({
    results: groups,
    meta: {
      count: groups.length,
      limit: currPerPage * currPage,
      offset: currPerPage * (currPage - 1),
    },
  }));
};

export const threshold = () => {
  const sections = randomNumber(2, 5);
  let rest = 100;
  return Promise.resolve({
    results: [...new Array(sections)].map(() => {
      const currPercent = randomNumber(0, rest);
      rest = rest - currPercent;
      return {
        [randomString()]: currPercent,
      };
    }),
  });
};

export const devicesInfo = (devicesCount) => {
  return Promise.resolve({
    results: {
      requiredApproval: devicesCount || 0,
      orphaned: 0,
      delivering: 0,
    },
  });
};

export const canariesInfo = () => {
  const canaries = randomNumber(0, 100);
  return Promise.resolve({
    results: [...new Array(canaries)].map(() => ({
      group: {
        name: randomString(),
        uuid: randomUUID(),
      },
      date: randomDate(),
      status: randomStatus(),
    })),
  });
};

export const groupsDetail = (uuid, { page, perPage }) => {
  const currPage = page || 1;
  const currPerPage = perPage || 20;
  const status = randomStatus();
  const group = groups.find(({ uuid: groupUUID }) => uuid === groupUUID);
  return Promise.resolve({
    uuid,
    name: group?.name || randomString(),
    results: group?.sensors?.map((uuid) =>
      rowGroupDetailCreator(
        uuid,
        `${randomNumber(0, 10)}.${randomNumber(0, 10)}`,
        status
      )
    ),
    meta: {
      count: group?.sensors?.length || 0,
      limit: currPerPage * currPage,
      offset: currPerPage * (currPage - 1),
    },
  });
};

export const groupDevicesInfo = (uuid) => {
  return Promise.resolve({
    uuid,
    total: 200,
    newDevices: randomNumber(0, 50),
    offlineDevices: randomNumber(0, 50),
    deliveringDevices: randomNumber(0, 50),
  });
};

export const createNewGroup = ({ groupName, isSecure, systemIDs }) => {
  groups.push(
    rowGroupCreator(randomUUID(), groupName, systemIDs, isSecure, new Date())
  );
  return Promise.resolve();
};

export const updateGroup = ({ uuid, systemIDs, groupName }) => {
  const group = groups.find(({ uuid: groupUUID }) => groupUUID === uuid);
  if (group) {
    group.sensors = systemIDs;
  } else {
    groups.push(rowGroupCreator(uuid, groupName, systemIDs, false, new Date()));
  }
  return Promise.resolve();
};

export const fetchActiveImages = ({ limit = 100, offset = 0 } = {}) => {
  return instance.get(
    `${IMAGE_BUILDER_API}/composes?limit=${limit}&offset=${offset}`
  );
};

export const fetchImageStatus = ({ id }) => {
  return instance.get(`${EDGE_API}/images/${id}/status`);
};

export const getImageById = ({ id }) => {
  return instance.get(`${EDGE_API}/images/${id}/details`);
};

export const fetchDeviceSummary = async () => {
  const client = new HostsApi(undefined, '/api/inventory/v1/', instance);
  return await Promise.all([
    client.apiHostGetHostList(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      ['fresh'],
      undefined,
      undefined,
      undefined,
      undefined,
      {
        query: {
          ...generateFilter(inventoryFields),
          ...generateFilter({ system_profile: ['host_type'] }, 'fields'),
        },
      }
    ),
    client.apiHostGetHostList(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      ['stale'],
      undefined,
      undefined,
      undefined,
      undefined,
      {
        query: {
          ...generateFilter(inventoryFields),
          ...generateFilter({ system_profile: ['host_type'] }, 'fields'),
        },
      }
    ),
    client.apiHostGetHostList(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      ['stale_warning'],
      undefined,
      undefined,
      undefined,
      undefined,
      {
        query: {
          ...generateFilter(inventoryFields),
          ...generateFilter({ system_profile: ['host_type'] }, 'fields'),
        },
      }
    ),
    client.apiHostGetHostList(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      ['unknown'],
      undefined,
      undefined,
      undefined,
      undefined,
      {
        query: {
          ...generateFilter(inventoryFields),
          ...generateFilter({ system_profile: ['host_type'] }, 'fields'),
        },
      }
    ),
  ]).then((resp) => {
    return resp.reduce((acc, curr, index) => {
      return { ...acc, [deviceSummaryMapper[index]]: curr.total };
    }, {});
  });
};

export const getPackages = async (distribution, architecture, search) => {
  const params = new URLSearchParams({
    distribution,
    architecture,
    search,
  });
  return instance(`${IMAGE_BUILDER_API}/packages?${params.toString()}`);
};

export const createImage = ({
  Id,
  name,
  version,
  description,
  release,
  architecture,
  username,
  credentials,
  imageType: imageTypes,
  'selected-packages': packages,
}) => {
  let [imageType] = imageTypes || [];
  if (imageTypes.length > 1) {
    imageType = 'rhel-edge-installer';
  }
  const payload = {
    name,
    version,
    description,
    distribution: release,
    imageType: imageType,
    packages: packages.map((item) => ({ name: item.name })),
    outputTypes: imageTypes,
    commit: {
      arch: architecture,
    },
    installer: {
      username,
      sshkey: credentials,
    },
  };

  let endpoint = `${EDGE_API}/images`;

  if (version > 1) {
    endpoint += `/${Id}/update`;
  }

  return instance.post(endpoint, payload);
};

export const fetchEdgeImages = (
  q = {
    limit: 100,
    offset: 0,
    sort_by: '-created_at',
  }
) => {
  const query = getTableParams(q);
  return instance.get(`${EDGE_API}/images?${query}`);
};

export const fetchEdgeImageSets = (
  q = {
    limit: 100,
    offset: 0,
    sort_by: '-created_at',
  }
) => {
  const query = getTableParams(q);
  return instance.get(`${EDGE_API}/image-sets?${query}`);
};

export const getEdgeImageStatus = (id) => {
  return instance.get(`${EDGE_API}/images/${id}/status`);
};

export const getDeviceHasUpdate = async (id) => {
  try {
    return await instance.get(`${EDGE_API}/devices/${id}`);
  } catch (err) {
    // temp error solution
    console.log('');
  }
};

export const updateDeviceLatestImage = async (payload) => {
  return await instance.post(`${EDGE_API}/updates`, payload);
};

export const getImageDataOnDevice = (id) => {
  return instance.get(`${EDGE_API}/updates/device/${id}/image`);
};

export const checkImageName = (name) => {
  const payload = {
    name,
  };
  return instance.post(`${EDGE_API}/images/checkImageName`, payload);
};

export const getCustomRepositories = () => {
  return instance.get(`${EDGE_API}/thirdpartyrepo`);
};

export const createCustomRepository = (payload) => {
  return instance.post(`${EDGE_API}/thirdpartyrepo`, {
    Name: payload.name,
    URL: payload.baseURL,
  });
};

export const getImageSet = ({
  id,
  q = {
    limit: 100,
    offset: 0,
    sort_by: '-created_at',
  },
}) => {
  const query = getTableParams(q);
  return instance.get(`${EDGE_API}/image-sets/${id}?${query}`);
};

export const getImagePackageMetadata = (id) => {
  try {
    return instance.get(`${EDGE_API}/images/${id}/metadata`);
  } catch (err) {
    console.log(err);
  }
};

export const editCustomRepository = (payload) => {
  return instance.put(`${EDGE_API}/thirdpartyrepo/${payload.id}`, {
    Name: payload.name,
    URL: payload.baseURL,
  });
};

export const removeCustomRepository = (id) =>
  instance.delete(`${EDGE_API}/thirdpartyrepo/${id}`);

export const getInventory = async () => {
  return await instance.get(`${EDGE_API}/devices`);
};

export const createGroup = (payload) => {
  return instance.post(`${EDGE_API}/device-groups/`, payload);
};

export const getGroups = () => {
  return instance.get(`${EDGE_API}/device-groups`);
};

export const getGroupById = (id) => {
  return instance.get(`${EDGE_API}/device-groups/${id}`);
};

export const updateGroupById = (id, payload) => {
  return instance.post(`${EDGE_API}/device-groups/${id}`, payload);
};

export const deleteGroupById = (id) => {
  return instance.post(`${EDGE_API}/device-groups/${id}`);
};
