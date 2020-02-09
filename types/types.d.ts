/// <reference types="node" />
import { Socket } from 'net';
import { Server as HttpServer } from 'http';
import { Server as HttpsServer } from 'https';

/**
 * @property gracefulTerminationTimeout Number of milliseconds to allow for the active sockets to complete serving the response (default: 5000).
 * @property server Instance of http.Server.
 */
export declare type HttpTerminatorConfigurationInputType = {
    gracefulTerminationTimeout?: number;
    server: HttpServer | HttpsServer;
};

/**
 * @property terminate Terminates HTTP server.
 */
export declare interface HttpTerminatorType {
    terminate: () => Promise<void>;
}

export declare interface InternalHttpTerminatorType extends HttpTerminatorType {
    secureSockets: Set<Socket>;
    sockets: Set<Socket>;
}
