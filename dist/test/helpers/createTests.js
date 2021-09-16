"use strict";
/* eslint-disable ava/no-ignored-test-files */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const agentkeepalive_1 = __importDefault(require("agentkeepalive"));
const ava_1 = __importDefault(require("ava"));
const delay_1 = __importDefault(require("delay"));
const got_1 = __importDefault(require("got"));
const sinon_1 = __importDefault(require("sinon"));
const createHttpTerminator_1 = __importDefault(require("../../src/factories/createHttpTerminator"));
const got = got_1.default.extend({
    https: {
        rejectUnauthorized: false,
    },
});
const KeepAliveHttpsAgent = agentkeepalive_1.default.HttpsAgent;
exports.default = (createHttpServer) => {
    (0, ava_1.default)('terminates HTTP server with no connections', async (t) => {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const httpServer = await createHttpServer(() => { });
        t.timeout(100);
        t.true(httpServer.server.listening);
        const terminator = (0, createHttpTerminator_1.default)({
            server: httpServer.server,
        });
        await terminator.terminate();
        t.false(httpServer.server.listening);
    });
    (0, ava_1.default)('terminates hanging sockets after gracefulTerminationTimeout', async (t) => {
        const spy = sinon_1.default.spy();
        const httpServer = await createHttpServer(() => {
            spy();
        });
        t.timeout(500);
        const terminator = (0, createHttpTerminator_1.default)({
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
        const stub = sinon_1.default.stub();
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
        const terminator = (0, createHttpTerminator_1.default)({
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
        // @todo https://stackoverflow.com/q/59832897/368691
        await t.throwsAsync(request1);
        const response0 = await request0;
        t.is(response0.headers.connection, 'close');
        t.is(response0.body, 'foo');
    });
    (0, ava_1.default)('ongoing requests receive {connection: close} header', async (t) => {
        const httpServer = await createHttpServer((incomingMessage, outgoingMessage) => {
            setTimeout(() => {
                outgoingMessage.end('foo');
            }, 100);
        });
        t.timeout(600);
        const terminator = (0, createHttpTerminator_1.default)({
            gracefulTerminationTimeout: 150,
            server: httpServer.server,
        });
        const httpAgent = new agentkeepalive_1.default({
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
        await (0, delay_1.default)(50);
        terminator.terminate();
        const response = await request;
        t.is(response.headers.connection, 'close');
        t.is(response.body, 'foo');
    });
    (0, ava_1.default)('ongoing requests receive {connection: close} header (new request reusing an existing socket)', async (t) => {
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
        const httpServer = await createHttpServer(stub);
        t.timeout(1000);
        const terminator = (0, createHttpTerminator_1.default)({
            gracefulTerminationTimeout: 150,
            server: httpServer.server,
        });
        const httpAgent = new agentkeepalive_1.default({
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
        await (0, delay_1.default)(50);
        terminator.terminate();
        const request1 = got(httpServer.url, {
            agent: {
                http: httpAgent,
                https: httpsAgent,
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
    (0, ava_1.default)('does not send {connection: close} when server is not terminating', async (t) => {
        const httpServer = await createHttpServer((incomingMessage, outgoingMessage) => {
            setTimeout(() => {
                outgoingMessage.end('foo');
            }, 50);
        });
        t.timeout(100);
        (0, createHttpTerminator_1.default)({
            server: httpServer.server,
        });
        const httpAgent = new agentkeepalive_1.default({
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
