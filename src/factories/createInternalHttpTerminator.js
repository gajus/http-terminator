// @flow

import http from 'http';
import delay from 'delay';
import type {
  HttpTerminatorConfigurationInputType,
  InternalHttpTerminatorType,
} from '../types';
import Logger from '../Logger';

const log = Logger.child({
  namespace: 'createHttpTerminator',
});

const configurationDefaults = {
  gracefulTerminationTimeout: 1000,
};

export default (configurationInput: HttpTerminatorConfigurationInputType): InternalHttpTerminatorType => {
  const configuration = {
    ...configurationDefaults,
    ...configurationInput,
  };

  const server = configuration.server;

  const sockets = new Set();
  const secureSockets = new Set();

  let terminating;

  server.on('connection', (socket) => {
    if (terminating) {
      socket.destroy();
    } else {
      sockets.add(socket);

      socket.once('close', () => {
        sockets.delete(socket);
      });
    }
  });

  server.on('secureConnection', (socket) => {
    if (terminating) {
      socket.destroy();
    } else {
      secureSockets.add(socket);

      socket.once('close', () => {
        secureSockets.delete(socket);
      });
    }
  });

  /**
   * Evaluate whether additional steps are required to destroy the socket.
   *
   * @see https://github.com/nodejs/node/blob/57bd715d527aba8dae56b975056961b0e429e91e/lib/_http_client.js#L363-L413
   */
  const destroySocket = (socket) => {
    const serverResponse = socket._httpMessage;

    if (serverResponse) {
      if (!serverResponse.headersSent) {
        serverResponse.setHeader('connection', 'close');
      }

      serverResponse.end();
    }

    socket.destroy();

    if (socket.server instanceof http.Server) {
      sockets.delete(socket);
    } else {
      secureSockets.delete(socket);
    }
  };

  const terminate = async () => {
    if (terminating) {
      log.warn('already terminating HTTP server');

      return terminating;
    }

    let resolveTerminating;
    let rejectTerminating;

    terminating = new Promise((resolve, reject) => {
      resolveTerminating = resolve;
      rejectTerminating = reject;
    });

    server.on('request', (incomingMessage, outgoingMessage) => {
      if (!outgoingMessage.headersSent) {
        outgoingMessage.setHeader('connection', 'close');
      }
    });

    let checkerInterval;
    await Promise.race([
      new Promise((resolve) => {
        checkerInterval = setInterval(() => {
          const everyoneClosed = sockets.size === 0 && secureSockets.size === 0;
          if (everyoneClosed) {
            clearInterval(checkerInterval);
            checkerInterval = null;
            resolve();
          }
        }, 20);
      }),
      delay(configuration.gracefulTerminationTimeout),
    ]);

    if (checkerInterval) {
      clearInterval(checkerInterval);
    }

    for (const socket of sockets) {
      // This is the HTTP CONNECT request socket.
      if (!(socket.server instanceof http.Server)) {
        continue;
      }
      destroySocket(socket);
    }

    for (const socket of secureSockets) {
      destroySocket(socket);
    }

    server.close((error) => {
      if (error) {
        rejectTerminating(error);
      } else {
        resolveTerminating();
      }
    });

    return terminating;
  };

  return {
    secureSockets,
    sockets,
    terminate,
  };
};
