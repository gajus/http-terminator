/* eslint-disable ava/no-ignored-test-files */

import KeepAliveHttpAgent from 'agentkeepalive';
import test from 'ava';
import delay from 'delay';
import safeGot from 'got';
import sinon from 'sinon';
import {
  createHttpTerminator,
} from '../../src/factories/createHttpTerminator';
import type {
  HttpServerFactory,
} from './createHttpServer';
import type {
  HttpsServerFactory,
} from './createHttpsServer';

const got = safeGot.extend({
  https: {
    rejectUnauthorized: false,
  },
});

const KeepAliveHttpsAgent = KeepAliveHttpAgent.HttpsAgent;

export const createTests = (
  createHttpServer: HttpServerFactory | HttpsServerFactory,
): void => {
  test('terminates HTTP server with no connections', async (t) => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const httpServer = await createHttpServer(() => {});

    t.timeout(100);

    t.true(httpServer.server.listening);

    const terminator = createHttpTerminator({
      server: httpServer.server,
    });

    await terminator.terminate();

    t.false(httpServer.server.listening);
  });

  test('terminates hanging sockets after gracefulTerminationTimeout', async (t) => {
    const spy = sinon.spy();

    const httpServer = await createHttpServer(() => {
      spy();
    });

    t.timeout(500);

    const terminator = createHttpTerminator({
      gracefulTerminationTimeout: 150,
      server: httpServer.server,
    });

    void got(httpServer.url);

    await delay(50);

    t.true(spy.called);

    void terminator.terminate();

    await delay(100);

    // The timeout has not passed.
    t.is(await httpServer.getConnections(), 1);

    await delay(100);

    t.is(await httpServer.getConnections(), 0);
  });

  test('server stops accepting new connections after terminator.terminate() is called', async (t) => {
    const stub = sinon.stub();

    stub
      .onCall(0)
      .callsFake((incomingMessage, outgoingMessage) => {
        setTimeout(() => {
          outgoingMessage.end('foo');
        }, 100);
      });

    stub
      .onCall(1)
      .callsFake((incomingMessage, outgoingMessage) => {
        outgoingMessage.end('bar');
      });

    const httpServer = await createHttpServer(stub);

    t.timeout(500);

    const terminator = createHttpTerminator({
      gracefulTerminationTimeout: 150,
      server: httpServer.server,
    });

    const request0 = got(httpServer.url);

    await delay(50);

    void terminator.terminate();

    await delay(50);

    const request1 = got(httpServer.url, {
      retry: 0,
      timeout: {
        connect: 50,
      },
    });

    // @todo https://stackoverflow.com/q/59832897/368691
    await t.throwsAsync(request1);

    const response0 = await request0;

    t.is(response0.headers.connection, 'close');
    t.is(response0.body, 'foo');
  });

  test('ongoing requests receive {connection: close} header', async (t) => {
    const httpServer = await createHttpServer((incomingMessage, outgoingMessage) => {
      setTimeout(() => {
        outgoingMessage.end('foo');
      }, 100);
    });

    t.timeout(600);

    const terminator = createHttpTerminator({
      gracefulTerminationTimeout: 150,
      server: httpServer.server,
    });

    const httpAgent = new KeepAliveHttpAgent({
      maxSockets: 1,
    });

    const httpsAgent = new KeepAliveHttpsAgent({
      maxSockets: 1,
    });

    const request = got(httpServer.url, {
      agent: {
        http: httpAgent,
        https: httpsAgent,
      },
    });

    await delay(50);

    void terminator.terminate();

    const response = await request;

    t.is(response.headers.connection, 'close');
    t.is(response.body, 'foo');
  });

  test('ongoing requests receive {connection: close} header (new request reusing an existing socket)', async (t) => {
    const stub = sinon.stub();

    stub
      .onCall(0)
      .callsFake((incomingMessage, outgoingMessage) => {
        outgoingMessage.write('foo');

        setTimeout(() => {
          outgoingMessage.end('bar');
        }, 50);
      });

    stub
      .onCall(1)
      .callsFake((incomingMessage, outgoingMessage) => {
        // @todo Unable to intercept the response without the delay.
        // When `end()` is called immediately, the `request` event
        // already has `headersSent=true`. It is unclear how to intercept
        // the response beforehand.
        setTimeout(() => {
          outgoingMessage.end('baz');
        }, 50);
      });

    const httpServer = await createHttpServer(stub);

    t.timeout(1_000);

    const terminator = createHttpTerminator({
      gracefulTerminationTimeout: 150,
      server: httpServer.server,
    });

    const httpAgent = new KeepAliveHttpAgent({
      maxSockets: 1,
    });

    const httpsAgent = new KeepAliveHttpsAgent({
      maxSockets: 1,
    });

    const request0 = got(httpServer.url, {
      agent: {
        http: httpAgent,
        https: httpsAgent,
      },
    });

    await delay(50);

    void terminator.terminate();

    const request1 = got(httpServer.url, {
      agent: {
        http: httpAgent,
        https: httpsAgent,
      },
      retry: 0,
    });

    await delay(50);

    t.is(stub.callCount, 2);

    const response0 = await request0;

    t.is(response0.headers.connection, 'keep-alive');
    t.is(response0.body, 'foobar');

    const response1 = await request1;

    t.is(response1.headers.connection, 'close');
    t.is(response1.body, 'baz');
  });

  test('does not send {connection: close} when server is not terminating', async (t) => {
    const httpServer = await createHttpServer((incomingMessage, outgoingMessage) => {
      setTimeout(() => {
        outgoingMessage.end('foo');
      }, 50);
    });

    t.timeout(100);

    createHttpTerminator({
      server: httpServer.server,
    });

    const httpAgent = new KeepAliveHttpAgent({
      maxSockets: 1,
    });

    const httpsAgent = new KeepAliveHttpsAgent({
      maxSockets: 1,
    });

    const response = await got(httpServer.url, {
      agent: {
        http: httpAgent,
        https: httpsAgent,
      },
    });

    t.is(response.headers.connection, 'keep-alive');
  });
};
