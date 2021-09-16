/// <reference types="node" />
import type { Server, IncomingMessage as HttpIncomingMessage, ServerResponse as HttpServerResponse } from 'http';
declare type RequestHandler = (incomingMessage: HttpIncomingMessage, outgoingMessage: HttpServerResponse) => void;
declare type HttpServerType = {
    readonly getConnections: () => Promise<number>;
    readonly port: number;
    readonly server: Server;
    readonly stop: () => Promise<void>;
    readonly url: string;
};
export declare type HttpServerFactory = (requestHandler: RequestHandler) => Promise<HttpServerType>;
declare const _default: (requestHandler: RequestHandler) => Promise<HttpServerType>;
export default _default;
