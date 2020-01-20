// @flow

import {
  createServer,
  Server,
  IncomingMessage as HttpsIncomingMessage,
  ServerResponse as HttpsServerResponse,
} from 'https';
import {
  promisify,
} from 'util';
import pem from 'pem';

type RequestHandlerType = (incomingMessage: HttpsIncomingMessage, outgoingMessage: HttpsServerResponse) => void;

type HttpsServerType = {|
  +getConnections: () => Promise<number>,
  +port: number,
  +server: Server,
  +stop: () => Promise<void>,
  +url: string,
|};

export type HttpsServerFactoryType = (requestHandler: RequestHandlerType) => Promise<HttpsServerType>;

export default async (requestHandler: RequestHandlerType): Promise<HttpsServerType> => {
  const {
    serviceKey,
    certificate,
    csr,
  } = await promisify(pem.createCertificate)({
    days: 365,
    selfSigned: true,
  });

  const httpsOptions = {
    ca: csr,
    cert: certificate,
    key: serviceKey,
  };

  const server = createServer(httpsOptions, requestHandler);

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
      const url = 'https://localhost:' + port;

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
