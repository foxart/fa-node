const environmentMap = new Set([
  'prod',
  'production',
  'live',
  'release',
  //
]);

export const isDevMode = (): boolean => {
  return !environmentMap.has('local');
};
