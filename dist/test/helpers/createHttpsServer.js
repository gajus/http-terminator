"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("https");
const util_1 = require("util");
const pem_1 = __importDefault(require("pem"));
exports.default = async (requestHandler) => {
    const { serviceKey, certificate, csr, } = await (0, util_1.promisify)(pem_1.default.createCertificate)({
        days: 365,
        selfSigned: true,
    });
    const httpsOptions = {
        ca: csr,
        cert: certificate,
        key: serviceKey,
    };
    const server = (0, https_1.createServer)(httpsOptions, requestHandler);
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
            const url = 'https://localhost:' + port;
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
