import {
  promisify,
} from 'util';
import express from 'express';
import type {
  TestServerFactory,
} from './types';

export const createExpressServer: TestServerFactory = (requestHandler) => {
  let server;

  const app = express();

  app.use((incomingMessage, serverResponse) => {
    requestHandler(serverResponse);
  });

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
    server = app.listen(() => {
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

    server.once('error', reject);
  });
};
