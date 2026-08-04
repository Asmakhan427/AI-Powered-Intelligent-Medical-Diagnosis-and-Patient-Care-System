// The canonical axios instance lives in lib/api.ts — request/response
// interceptors for bearer-token injection and silent refresh-on-401, plus
// getErrorMessage() for turning the backend's `{success:false, error}`
// envelope into a display string. Every lib/endpoints/*.ts module already
// imports from there; re-exported here under the requested services/ path
// rather than moved, to avoid churning every one of those import sites.
export { api, getErrorMessage, default } from '../lib/api';
