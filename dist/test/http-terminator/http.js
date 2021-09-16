"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const createHttpServer_1 = __importDefault(require("../helpers/createHttpServer"));
const createTests_1 = __importDefault(require("../helpers/createTests"));
(0, createTests_1.default)(createHttpServer_1.default);
