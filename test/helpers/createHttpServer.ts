import type {
  Server,
  IncomingMessage as HttpIncomingMessage,
  ServerResponse as HttpServerResponse,
} from 'http';
import {
  createServer,
} from 'http';
import {
  promisify,
} from 'util';

type RequestHandler = (incomingMessage: HttpIncomingMessage, outgoingMessage: HttpServerResponse) => void;

type HttpServerType = {
  readonly getConnections: () => Promise<number>,
  readonly port: number,
  readonly server: Server,
  readonly stop: () => Promise<void>,
  readonly url: string,
};

export type HttpServerFactory = (requestHandler: RequestHandler) => Promise<HttpServerType>;

export const createHttpServer = (
  requestHandler: RequestHandler,
): Promise<HttpServerType> => {
  const server = createServer(requestHandler);

  let serverShutingDown;

  const stop = () => {
    if (serverShutingDown) {
      return serverShutingDown;
    }

    serverShutingDown = promisify(server.close.bind(server))();

    return serverShutingDown;
  };

  const getConnections = () => {
    return promisify(server.getConnections.bind(server))();
  };

  return new Promise((resolve, reject) => {
    server.once('error', reject);

    server.listen(() => {
      // @ts-expect-error-error address should be always available inside the `.listen()` block.
      const port = server.address().port;
      const url = 'http://localhost:' + port;

      resolve({
        getConnections,
        port,
        server,
        stop,
        url,
      });
    });
  });
};
