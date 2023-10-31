export const deletePrefixedId = (id: string) => {
  const originalId = id.split(":")[1];
  return originalId;
};
