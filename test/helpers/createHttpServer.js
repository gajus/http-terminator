// @flow

import {
  createServer,
  Server,
  IncomingMessage as HttpIncomingMessage,
  ServerResponse as HttpServerResponse,
} from 'http';
import {
  promisify,
} from 'util';

type RequestHandlerType = (incomingMessage: HttpIncomingMessage, outgoingMessage: HttpServerResponse) => void;

type HttpServerType = {|
  +getConnections: () => Promise<number>,
  +port: number,
  +server: Server,
  +stop: () => Promise<void>,
  +url: string,
|};

export type HttpServerFactoryType = (requestHandler: RequestHandlerType) => Promise<HttpServerType>;

export default (requestHandler: RequestHandlerType): Promise<HttpServerType> => {
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
