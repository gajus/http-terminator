// @flow

import test from 'ava';
import sinon from 'sinon';
import delay from 'delay';
import got from 'got';
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

  t.true(httpServer.server.listening);

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
  t.true(httpServer.server.listening);

  await delay(100);

  t.false(httpServer.server.listening);
});
