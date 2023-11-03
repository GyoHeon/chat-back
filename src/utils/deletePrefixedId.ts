export const deletePrefixedId = (id: string) => {
  const originalId = id.split(":")[1];
  return originalId;
};

export const deletePrefixedIds = (ids: string[]) => {
  const originalIds = [...new Set(ids.map(deletePrefixedId))];
  return originalIds;
};
