"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const util_1 = require("util");
exports.default = (requestHandler) => {
    const server = (0, http_1.createServer)(requestHandler);
    let serverShutingDown;
    const stop = () => {
        if (serverShutingDown) {
            return serverShutingDown;
        }
        serverShutingDown = (0, util_1.promisify)(server.close.bind(server))();
        return serverShutingDown;
    };
    const getConnections = () => {
        return (0, util_1.promisify)(server.getConnections.bind(server))();
    };
    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(() => {
            // @ts-expect-error-error address should be always available inside the `.listen()` block.
            const port = server.address().port;
            const url = 'http://localhost:' + port;
            resolve({
                getConnections,
                port,
                server,
                stop,
                url,
            });
        });
    });
};
