// @flow

import test from 'ava';
import sinon from 'sinon';
import delay from 'delay';
import got from 'got';
import KeepAliveHttpAgent from 'agentkeepalive';
import createHttpServer from '../../helpers/createHttpServer';
import createHttpTerminator from '../../../src/factories/createHttpTerminator';

test('terminates HTTP server with no connections', async (t) => {
  // eslint-disable-next-line ava/use-t-well
  t.timeout(100);

  const httpServer = await createHttpServer(() => {});

  t.true(httpServer.server.listening);

  const terminator = createHttpTerminator({
    server: httpServer.server,
  });

  await terminator.terminate();

  t.false(httpServer.server.listening);
});

test('terminates hanging sockets after httpResponseTimeout', async (t) => {
  // eslint-disable-next-line ava/use-t-well
  t.timeout(500);

  const spy = sinon.spy();

  const httpServer = await createHttpServer(() => {
    spy();
  });

  const terminator = createHttpTerminator({
    httpResponseTimeout: 150,
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
  // eslint-disable-next-line ava/use-t-well
  t.timeout(500);

  const httpServer = await createHttpServer((incomingMessage, outgoingMessage) => {
    setTimeout(() => {
      outgoingMessage.end('foo');
    }, 100);
  });

  const terminator = createHttpTerminator({
    httpResponseTimeout: 150,
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
  // eslint-disable-next-line ava/use-t-well
  t.timeout(500);

  const httpServer = await createHttpServer((incomingMessage, outgoingMessage) => {
    setTimeout(() => {
      outgoingMessage.end('foo');
    }, 100);
  });

  const terminator = createHttpTerminator({
    httpResponseTimeout: 150,
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
