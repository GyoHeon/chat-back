export const extractPrefixId = (id: string) => {
  const serverId = id.split(":")[0];
  return serverId;
};

export const makePrefixedId = (id: string, serverId: string) => {
  const prefixedId = `${serverId}:${id}`;
  return prefixedId;
};

export const deletePrefixedId = (id: string) => {
  const originalId = id.split(":")[1];
  return originalId;
};

export const deletePrefixedIds = (ids: string[]) => {
  const originalIds = [...new Set(ids.map(deletePrefixedId))];
  return originalIds;
};
