/// <reference types="node" />
import type { IncomingMessage as HttpIncomingMessage, ServerResponse as HttpServerResponse } from 'http';
import type { Server } from 'https';
declare type RequestHandler = (incomingMessage: HttpIncomingMessage, outgoingMessage: HttpServerResponse) => void;
declare type HttpsServer = {
    readonly getConnections: () => Promise<number>;
    readonly port: number;
    readonly server: Server;
    readonly stop: () => Promise<void>;
    readonly url: string;
};
export declare type HttpsServerFactory = (requestHandler: RequestHandler) => Promise<HttpsServer>;
declare const _default: (requestHandler: RequestHandler) => Promise<HttpsServer>;
export default _default;
