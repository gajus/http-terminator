// @flow

import http from 'http';
import delay from 'delay';
import type {
  HttpTerminatorType,
  HttpTerminatorConfigurationInputType,
} from '../types';
import Logger from '../Logger';

const log = Logger.child({
  namespace: 'createHttpTerminator',
});

const configurationDefaults = {
  httpResponseTimeout: 1000,
};

export default (configurationInput: HttpTerminatorConfigurationInputType): HttpTerminatorType => {
  const configuration = {
    ...configurationDefaults,
    ...configurationInput,
  };

  const server = configuration.server;

  const sockets = new Set();
  const secureSockets = new Set();

  server.on('connection', (socket) => {
    sockets.add(socket);

    server.once('close', () => {
      sockets.delete(socket);
    });
  });

  server.on('secureConnection', (socket) => {
    secureSockets.add(socket);

    server.once('close', () => {
      secureSockets.delete(socket);
    });
  });

  let terminating;

  /**
   * Evaluate whether additional steps are required to destroy the socket.
   *
   * @see https://github.com/nodejs/node/blob/57bd715d527aba8dae56b975056961b0e429e91e/lib/_http_client.js#L363-L413
   */
  const destroySocket = (socket) => {
    socket.destroy();

    sockets.delete(socket);
  };

  const terminate = async () => {
    if (terminating) {
      log.warn('already terminating HTTP server');

      return terminating;
    }

    server.on('request', (incomingMessage, outgoingMessage) => {
      if (!outgoingMessage.headersSent) {
        outgoingMessage.setHeader('connection', 'close');
      }
    });

    for (const socket of sockets) {
      // This is the HTTP CONNECT request socket.
      if (!(socket.server instanceof http.Server)) {
        continue;
      }

      const serverResponse = socket._httpMessage;

      if (serverResponse) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader('connection', 'close');
        }

        continue;
      }

      destroySocket(socket);
    }

    for (const socket of secureSockets) {
      const serverResponse = socket._httpMessage;

      if (serverResponse) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader('connection', 'close');
        }

        continue;
      }

      destroySocket(socket);
    }

    if (sockets.size) {
      await delay(configuration.httpResponseTimeout);

      for (const socket of sockets) {
        destroySocket(socket);
      }
    }

    terminating = new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    return terminating;
  };

  return {
    terminate,
  };
};
