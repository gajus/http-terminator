import type {
  Server as HttpServer,
} from 'http';
import type {
  Server as HttpsServer,
} from 'https';
import type {
  Duplex,
} from 'node:stream';
import type {
  Merge,
} from 'type-fest';

/**
 * @property gracefulTerminationTimeout Number of milliseconds to allow for the active sockets to complete serving the response (default: 5000).
 * @property server Instance of http.Server.
 */
export type HttpTerminatorConfigurationInput = {
  readonly gracefulTerminationTimeout?: number,
  readonly server: HttpServer | HttpsServer,
};

/**
 * @property terminate Terminates HTTP server.
 */
export type HttpTerminator = {
  readonly terminate: () => Promise<void>,
};

export type InternalHttpTerminator = Merge<HttpTerminator, {
  readonly secureSockets: Set<Duplex>,
  readonly sockets: Set<Duplex>,
}>;
