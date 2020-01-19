// @flow

import type {
  Server,
} from 'http';

/**
 * @property httpResponseTimeout Number of milliseconds to allow for the active sockets to complete serving the response (default: 1000).
 */
export type HttpTerminatorConfigurationInputType = {|
  +httpResponseTimeout?: number,
  +server: Server,
|};

export type HttpTerminatorType = {|
  +terminate: () => Promise<void>,
|};
