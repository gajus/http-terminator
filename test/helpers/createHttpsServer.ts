import {
  createServer,
} from 'https';
import {
  promisify,
} from 'util';
import pem from 'pem';
import type {
  TestServerFactory,
} from './types';

export const createHttpsServer: TestServerFactory = async (requestHandler) => {
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
    (incomingMessage, serverResponse) => {
      requestHandler(serverResponse);
    },
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
