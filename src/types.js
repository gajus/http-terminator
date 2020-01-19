// @flow

import type {
  Server,
} from 'http';

/**
 * @property httpResponseTimeout Number of milliseconds to allow for the active sockets to complete serving the response (default: 1000).
 * @property server Instance of http.Server.
 */
export type HttpTerminatorConfigurationInputType = {|
  +httpResponseTimeout?: number,
  +server: Server,
|};

/**
 * @property terminate Terminates HTTP server.
 */
export type HttpTerminatorType = {|
  +terminate: () => Promise<void>,
|};
