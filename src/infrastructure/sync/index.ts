/**
 * Optional sync layer (WB-201 spike). Not wired into the app: importing it does
 * not change local-only behaviour, and it is tree-shaken out of the production
 * bundle because nothing in `src/app` or `src/hooks` references it.
 */
export * from './apiRepositories';
export * from './http';
export * from './remoteStorageAdapter';
