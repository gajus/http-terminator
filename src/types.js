// @flow

import {
  Socket,
} from 'net';
import type {
  Server as HttpServer,
} from 'http';
import type {
  Server as HttpsServer,
} from 'https';

/**
 * @property gracefulTerminationTimeout Number of milliseconds to allow for the active sockets to complete serving the response (default: 5000).
 * @property server Instance of http.Server.
 */
export type HttpTerminatorConfigurationInputType = {|
  +gracefulTerminationTimeout?: number,
  +server: HttpServer | HttpsServer,
|};

/**
 * @property terminate Terminates HTTP server.
 */
export type HttpTerminatorType = {|
  +terminate: () => Promise<void>,
|};

export type InternalHttpTerminatorType = {|
  ...HttpTerminatorType,
  secureSockets: Set<Socket>,
  sockets: Set<Socket>,
|};
