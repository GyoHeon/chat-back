export const makePrefixedId = (id: string, serverId: string) => {
  const prefixedId = `${serverId}:${id}`;
  return prefixedId;
};
