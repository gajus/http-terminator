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
  TestServerFactory,
} from './types';

const got = safeGot.extend({
  https: {
    rejectUnauthorized: false,
  },
});

const KeepAliveHttpsAgent = KeepAliveHttpAgent.HttpsAgent;

export const createTests = (
  createTestServer: TestServerFactory,
): void => {
  test('terminates HTTP server with no connections', async (t) => {
    const testServer = await createTestServer(() => {});

    t.timeout(100);

    t.true(testServer.server.listening);

    const terminator = createHttpTerminator({
      server: testServer.server,
    });

    await terminator.terminate();

    t.false(testServer.server.listening);
  });

  test('terminates hanging sockets after gracefulTerminationTimeout', async (t) => {
    const spy = sinon.spy();

    const testServer = await createTestServer(() => {
      spy();
    });

    t.timeout(500);

    const terminator = createHttpTerminator({
      gracefulTerminationTimeout: 150,
      server: testServer.server,
    });

    void got(testServer.url);

    await delay(50);

    t.true(spy.called);

    void terminator.terminate();

    await delay(100);

    // The timeout has not passed.
    t.is(await testServer.getConnections(), 1);

    await delay(100);

    t.is(await testServer.getConnections(), 0);
  });

  test('server stops accepting new connections after terminator.terminate() is called', async (t) => {
    const stub = sinon.stub();

    stub
      .onCall(0)
      .callsFake((serverResponse) => {
        setTimeout(() => {
          serverResponse.end('foo');
        }, 100);
      });

    stub
      .onCall(1)
      .callsFake((serverResponse) => {
        serverResponse.end('bar');
      });

    const testServer = await createTestServer(stub);

    t.timeout(500);

    const terminator = createHttpTerminator({
      gracefulTerminationTimeout: 150,
      server: testServer.server,
    });

    const request0 = got(testServer.url);

    await delay(50);

    void terminator.terminate();

    await delay(50);

    const request1 = got(testServer.url, {
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
    const testServer = await createTestServer((serverResponse) => {
      setTimeout(() => {
        serverResponse.end('foo');
      }, 100);
    });

    t.timeout(600);

    const terminator = createHttpTerminator({
      gracefulTerminationTimeout: 150,
      server: testServer.server,
    });

    const httpAgent = new KeepAliveHttpAgent({
      maxSockets: 1,
    });

    const httpsAgent = new KeepAliveHttpsAgent({
      maxSockets: 1,
    });

    const request = got(testServer.url, {
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
      .callsFake((serverResponse) => {
        serverResponse.write('foo');

        setTimeout(() => {
          serverResponse.end('bar');
        }, 50);
      });

    stub
      .onCall(1)
      .callsFake((serverResponse) => {
        // @todo Unable to intercept the response without the delay.
        // When `end()` is called immediately, the `request` event
        // already has `headersSent=true`. It is unclear how to intercept
        // the response beforehand.
        setTimeout(() => {
          serverResponse.end('baz');
        }, 50);
      });

    const testServer = await createTestServer(stub);

    t.timeout(1_000);

    const terminator = createHttpTerminator({
      gracefulTerminationTimeout: 150,
      server: testServer.server,
    });

    const httpAgent = new KeepAliveHttpAgent({
      maxSockets: 1,
    });

    const httpsAgent = new KeepAliveHttpsAgent({
      maxSockets: 1,
    });

    const request0 = got(testServer.url, {
      agent: {
        http: httpAgent,
        https: httpsAgent,
      },
    });

    await delay(50);

    void terminator.terminate();

    const request1 = got(testServer.url, {
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
    const testServer = await createTestServer((serverResponse) => {
      setTimeout(() => {
        serverResponse.end('foo');
      }, 50);
    });

    t.timeout(100);

    createHttpTerminator({
      server: testServer.server,
    });

    const httpAgent = new KeepAliveHttpAgent({
      maxSockets: 1,
    });

    const httpsAgent = new KeepAliveHttpsAgent({
      maxSockets: 1,
    });

    const response = await got(testServer.url, {
      agent: {
        http: httpAgent,
        https: httpsAgent,
      },
    });

    t.is(response.headers.connection, 'keep-alive');
  });
};
