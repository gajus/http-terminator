import {
  createServer,
} from 'https';
import {
  promisify,
} from 'util';
import pem from 'pem';
import got from 'got';
import delay from 'delay';

const createCertificate = promisify(pem.createCertificate);

const createHttpsServer = async (requestHandler) => {
  const {
    serviceKey,
    certificate,
    csr,
  } = await createCertificate({
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

const main = async () => {
  const httpsServer = await createHttpsServer(() => {});

  got(httpsServer.url);

  await delay(200);

  console.log('connection count:', await httpsServer.getConnections());
};

main();
