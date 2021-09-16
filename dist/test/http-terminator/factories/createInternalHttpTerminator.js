"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const agentkeepalive_1 = __importDefault(require("agentkeepalive"));
const ava_1 = __importDefault(require("ava"));
const delay_1 = __importDefault(require("delay"));
const got_1 = __importDefault(require("got"));
const sinon_1 = __importDefault(require("sinon"));
const createInternalHttpTerminator_1 = __importDefault(require("../../../src/factories/createInternalHttpTerminator"));
const createHttpServer_1 = __importDefault(require("../../helpers/createHttpServer"));
const createHttpsServer_1 = __importDefault(require("../../helpers/createHttpsServer"));
const got = got_1.default.extend({
    https: {
        rejectUnauthorized: false,
    },
});
(0, ava_1.default)('terminates HTTP server with no connections', async (t) => {
    t.timeout(100);
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const httpServer = await (0, createHttpServer_1.default)(() => { });
    t.true(httpServer.server.listening);
    const terminator = (0, createInternalHttpTerminator_1.default)({
        server: httpServer.server,
    });
    await terminator.terminate();
    t.false(httpServer.server.listening);
});
(0, ava_1.default)('terminates hanging sockets after httpResponseTimeout', async (t) => {
    t.timeout(500);
    const spy = sinon_1.default.spy();
    const httpServer = await (0, createHttpServer_1.default)(() => {
        spy();
    });
    const terminator = (0, createInternalHttpTerminator_1.default)({
        gracefulTerminationTimeout: 150,
        server: httpServer.server,
    });
    got(httpServer.url);
    await (0, delay_1.default)(50);
    t.true(spy.called);
    terminator.terminate();
    await (0, delay_1.default)(100);
    // The timeout has not passed.
    t.is(await httpServer.getConnections(), 1);
    await (0, delay_1.default)(100);
    t.is(await httpServer.getConnections(), 0);
});
(0, ava_1.default)('server stops accepting new connections after terminator.terminate() is called', async (t) => {
    t.timeout(500);
    const httpServer = await (0, createHttpServer_1.default)((incomingMessage, outgoingMessage) => {
        setTimeout(() => {
            outgoingMessage.end('foo');
        }, 100);
    });
    const terminator = (0, createInternalHttpTerminator_1.default)({
        gracefulTerminationTimeout: 150,
        server: httpServer.server,
    });
    const request0 = got(httpServer.url);
    await (0, delay_1.default)(50);
    terminator.terminate();
    await (0, delay_1.default)(50);
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
(0, ava_1.default)('ongoing requests receive {connection: close} header', async (t) => {
    t.timeout(500);
    const httpServer = await (0, createHttpServer_1.default)((incomingMessage, outgoingMessage) => {
        setTimeout(() => {
            outgoingMessage.end('foo');
        }, 100);
    });
    const terminator = (0, createInternalHttpTerminator_1.default)({
        gracefulTerminationTimeout: 150,
        server: httpServer.server,
    });
    const request = got(httpServer.url, {
        agent: {
            http: new agentkeepalive_1.default(),
        },
    });
    await (0, delay_1.default)(50);
    terminator.terminate();
    const response = await request;
    t.is(response.headers.connection, 'close');
    t.is(response.body, 'foo');
});
(0, ava_1.default)('ongoing requests receive {connection: close} header (new request reusing an existing socket)', async (t) => {
    t.timeout(1000);
    const stub = sinon_1.default.stub();
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
    const httpServer = await (0, createHttpServer_1.default)(stub);
    const terminator = (0, createInternalHttpTerminator_1.default)({
        gracefulTerminationTimeout: 150,
        server: httpServer.server,
    });
    const agent = new agentkeepalive_1.default({
        maxSockets: 1,
    });
    const request0 = got(httpServer.url, {
        agent: {
            http: agent,
        },
    });
    await (0, delay_1.default)(50);
    terminator.terminate();
    const request1 = got(httpServer.url, {
        agent: {
            http: agent,
        },
        retry: 0,
    });
    await (0, delay_1.default)(50);
    t.is(stub.callCount, 2);
    const response0 = await request0;
    t.is(response0.headers.connection, 'keep-alive');
    t.is(response0.body, 'foobar');
    const response1 = await request1;
    t.is(response1.headers.connection, 'close');
    t.is(response1.body, 'baz');
});
(0, ava_1.default)('empties internal socket collection', async (t) => {
    t.timeout(500);
    const httpServer = await (0, createHttpServer_1.default)((incomingMessage, outgoingMessage) => {
        outgoingMessage.end('foo');
    });
    const terminator = (0, createInternalHttpTerminator_1.default)({
        gracefulTerminationTimeout: 150,
        server: httpServer.server,
    });
    await got(httpServer.url);
    await (0, delay_1.default)(50);
    t.is(terminator.sockets.size, 0);
    t.is(terminator.secureSockets.size, 0);
    await terminator.terminate();
});
(0, ava_1.default)('empties internal socket collection for https server', async (t) => {
    t.timeout(500);
    const httpsServer = await (0, createHttpsServer_1.default)((incomingMessage, outgoingMessage) => {
        outgoingMessage.end('foo');
    });
    const terminator = (0, createInternalHttpTerminator_1.default)({
        gracefulTerminationTimeout: 150,
        server: httpsServer.server,
    });
    await got(httpsServer.url);
    await (0, delay_1.default)(50);
    t.is(terminator.secureSockets.size, 0);
    await terminator.terminate();
});
(0, ava_1.default)('closes immediately after in-flight connections are closed (#16)', async (t) => {
    t.timeout(1000);
    const spy = sinon_1.default.spy((incomingMessage, outgoingMessage) => {
        setTimeout(() => {
            outgoingMessage.end('foo');
        }, 100);
    });
    const httpServer = await (0, createHttpServer_1.default)(spy);
    t.true(httpServer.server.listening);
    const terminator = (0, createInternalHttpTerminator_1.default)({
        gracefulTerminationTimeout: 500,
        server: httpServer.server,
    });
    got(httpServer.url);
    await (0, delay_1.default)(50);
    t.is(await httpServer.getConnections(), 1);
    terminator.terminate();
    // Wait for outgoingMessage.end to be called, plus a few extra ms for the
    // terminator to finish polling in-flight connections. (Do not, however, wait
    // long enough to trigger graceful termination.)
    await (0, delay_1.default)(75);
    t.is(await httpServer.getConnections(), 0);
});
