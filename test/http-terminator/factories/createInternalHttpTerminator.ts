import KeepAliveHttpAgent from 'agentkeepalive';
import test from 'ava';
import delay from 'delay';
import safeGot from 'got';
import sinon from 'sinon';
import createInternalHttpTerminator from '../../../src/factories/createInternalHttpTerminator';
import createHttpServer from '../../helpers/createHttpServer';
import createHttpsServer from '../../helpers/createHttpsServer';

const got = safeGot.extend({
  https: {
    rejectUnauthorized: false,
  },
});

test('terminates HTTP server with no connections', async (t) => {
  t.timeout(100);

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const httpServer = await createHttpServer(() => {});

  t.true(httpServer.server.listening);

  const terminator = createInternalHttpTerminator({
    server: httpServer.server,
  });

  await terminator.terminate();

  t.false(httpServer.server.listening);
});

test('terminates hanging sockets after httpResponseTimeout', async (t) => {
  t.timeout(500);

  const spy = sinon.spy();

  const httpServer = await createHttpServer(() => {
    spy();
  });

  const terminator = createInternalHttpTerminator({
    gracefulTerminationTimeout: 150,
    server: httpServer.server,
  });

  got(httpServer.url);

  await delay(50);

  t.true(spy.called);

  terminator.terminate();

  await delay(100);

  // The timeout has not passed.
  t.is(await httpServer.getConnections(), 1);

  await delay(100);

  t.is(await httpServer.getConnections(), 0);
});

test('server stops accepting new connections after terminator.terminate() is called', async (t) => {
  t.timeout(500);

  const httpServer = await createHttpServer((incomingMessage, outgoingMessage) => {
    setTimeout(() => {
      outgoingMessage.end('foo');
    }, 100);
  });

  const terminator = createInternalHttpTerminator({
    gracefulTerminationTimeout: 150,
    server: httpServer.server,
  });

  const request0 = got(httpServer.url);

  await delay(50);

  terminator.terminate();

  await delay(50);

  const request1 = got(httpServer.url, {
    retry: 0,
    timeout: {
      connect: 50,
    },
  });

  await t.throwsAsync(request1);

  const response0 = await request0;

  t.is(response0.headers.connection, 'close');
  t.is(response0.body, 'foo');
});

test('ongoing requests receive {connection: close} header', async (t) => {
  t.timeout(500);

  const httpServer = await createHttpServer((incomingMessage, outgoingMessage) => {
    setTimeout(() => {
      outgoingMessage.end('foo');
    }, 100);
  });

  const terminator = createInternalHttpTerminator({
    gracefulTerminationTimeout: 150,
    server: httpServer.server,
  });

  const request = got(httpServer.url, {
    agent: {
      http: new KeepAliveHttpAgent(),
    },
  });

  await delay(50);

  terminator.terminate();

  const response = await request;

  t.is(response.headers.connection, 'close');
  t.is(response.body, 'foo');
});

test('ongoing requests receive {connection: close} header (new request reusing an existing socket)', async (t) => {
  t.timeout(1_000);

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

  const terminator = createInternalHttpTerminator({
    gracefulTerminationTimeout: 150,
    server: httpServer.server,
  });

  const agent = new KeepAliveHttpAgent({
    maxSockets: 1,
  });

  const request0 = got(httpServer.url, {
    agent: {
      http: agent,
    },
  });

  await delay(50);

  terminator.terminate();

  const request1 = got(httpServer.url, {
    agent: {
      http: agent,
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

test('empties internal socket collection', async (t) => {
  t.timeout(500);

  const httpServer = await createHttpServer((incomingMessage, outgoingMessage) => {
    outgoingMessage.end('foo');
  });

  const terminator = createInternalHttpTerminator({
    gracefulTerminationTimeout: 150,
    server: httpServer.server,
  });

  await got(httpServer.url);

  await delay(50);

  t.is(terminator.sockets.size, 0);
  t.is(terminator.secureSockets.size, 0);

  await terminator.terminate();
});

test('empties internal socket collection for https server', async (t) => {
  t.timeout(500);

  const httpsServer = await createHttpsServer((incomingMessage, outgoingMessage) => {
    outgoingMessage.end('foo');
  });

  const terminator = createInternalHttpTerminator({
    gracefulTerminationTimeout: 150,
    server: httpsServer.server,
  });

  await got(httpsServer.url);

  await delay(50);

  t.is(terminator.secureSockets.size, 0);

  await terminator.terminate();
});

test('closes immediately after in-flight connections are closed (#16)', async (t) => {
  t.timeout(1_000);

  const spy = sinon.spy((incomingMessage, outgoingMessage) => {
    setTimeout(() => {
      outgoingMessage.end('foo');
    }, 100);
  });

  const httpServer = await createHttpServer(spy);

  t.true(httpServer.server.listening);

  const terminator = createInternalHttpTerminator({
    gracefulTerminationTimeout: 500,
    server: httpServer.server,
  });

  got(httpServer.url);

  await delay(50);

  t.is(await httpServer.getConnections(), 1);

  terminator.terminate();

  // Wait for outgoingMessage.end to be called, plus a few extra ms for the
  // terminator to finish polling in-flight connections. (Do not, however, wait
  // long enough to trigger graceful termination.)
  await delay(75);

  t.is(await httpServer.getConnections(), 0);
});
