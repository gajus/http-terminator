import {
  promisify,
} from 'util';
import fastify from 'fastify';
import type {
  TestServerFactory,
} from './types';

export const createFastifyServer: TestServerFactory = async (requestHandler) => {
  const app = fastify();

  const server = app.server;

  app.get('/', (request, reply) => {
    requestHandler(reply.raw);
  });

  let serverShutingDown;

  const stop = () => {
    if (serverShutingDown) {
      return serverShutingDown;
    }

    serverShutingDown = app.close();

    return serverShutingDown;
  };

  const getConnections = () => {
    return promisify(server.getConnections.bind(server))();
  };

  const address = await app.listen(0);

  const port = Number(address.split(':')[2]);
  const url = 'http://localhost:' + port;

  return {
    getConnections,
    port,
    server,
    stop,
    url,
  };
};
