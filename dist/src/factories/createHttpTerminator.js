"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const createInternalHttpTerminator_1 = __importDefault(require("./createInternalHttpTerminator"));
exports.default = (configurationInput) => {
    const httpTerminator = (0, createInternalHttpTerminator_1.default)(configurationInput);
    return {
        terminate: httpTerminator.terminate,
    };
};
