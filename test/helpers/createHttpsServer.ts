import type {
  IncomingMessage as HttpIncomingMessage,
  ServerResponse as HttpServerResponse,
} from 'http';
import type {
  Server,
} from 'https';
import {
  createServer,
} from 'https';
import {
  promisify,
} from 'util';
import pem from 'pem';

type RequestHandler = (incomingMessage: HttpIncomingMessage, outgoingMessage: HttpServerResponse) => void;

type HttpsServer = {
  readonly getConnections: () => Promise<number>,
  readonly port: number,
  readonly server: Server,
  readonly stop: () => Promise<void>,
  readonly url: string,
};

export type HttpsServerFactory = (requestHandler: RequestHandler) => Promise<HttpsServer>;

export const createHttpsServer = async (requestHandler: RequestHandler): Promise<HttpsServer> => {
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

  const server = createServer(
    httpsOptions,
    requestHandler,
  );

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

  return await new Promise((resolve, reject) => {
    server.once('error', reject);

    server.listen(() => {
      // @ts-expect-error-error address should be always available inside the `.listen()` block.
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
