// @flow

import http, {
  Server,
  IncomingMessage as HttpIncomingMessage,
  ServerResponse as HttpServerResponse,
} from 'http';
import {
  promisify,
} from 'util';

type RequestHandlerType = (incomingMessage: HttpIncomingMessage, outgoingMessage: HttpServerResponse) => void;

type HttpServerType = {|
  +port: number,
  +server: Server,
  +stop: () => Promise<void>,
  +url: string,
|};

export default (requestHandler: RequestHandlerType): Promise<HttpServerType> => {
  const server = http.createServer(requestHandler);

  let serverShutingDown;

  const stop = () => {
    if (serverShutingDown) {
      return serverShutingDown;
    }

    serverShutingDown = promisify(server.close.bind(server))();

    return serverShutingDown;
  };

  return new Promise((resolve, reject) => {
    server.once('error', reject);

    // eslint-disable-next-line no-undefined

    server.listen(() => {
      const port = server.address().port;
      const url = 'http://localhost:' + port;

      resolve({
        port,
        server,
        stop,
        url,
      });
    });
  });
};
