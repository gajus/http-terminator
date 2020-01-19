# http-terminator 🦾

[![Travis build status](http://img.shields.io/travis/gajus/http-terminator/master.svg?style=flat-square)](https://travis-ci.org/gajus/http-terminator)
[![Coveralls](https://img.shields.io/coveralls/gajus/http-terminator.svg?style=flat-square)](https://coveralls.io/github/gajus/http-terminator)
[![NPM version](http://img.shields.io/npm/v/http-terminator.svg?style=flat-square)](https://www.npmjs.org/package/http-terminator)
[![Canonical Code Style](https://img.shields.io/badge/code%20style-canonical-blue.svg?style=flat-square)](https://github.com/gajus/canonical)
[![Twitter Follow](https://img.shields.io/twitter/follow/kuizinas.svg?style=social&label=Follow)](https://twitter.com/kuizinas)

Terminates HTTP server.

{"gitdown": "contents"}

## Behaviour

When you call [`server.close()`](https://nodejs.org/api/http.html#http_server_close_callback), it stops the server from accepting new connections, but it keeps the existing connections open indefinitely. This can result in your server hanging indefinitely due to keep-alive connections or because of the ongoing requests that do not produce a response. Therefore, in order to close the server, you must track creation of all connections and terminate them yourself.

http-terminator implements the logic for tracking all connections and their termination upon a timeout. http-terminator also ensures graceful communication of the server intention to shutdown to any clients that are currently receiving response from this server.

## Usage

Use `createHttpTerminator` to create an instance of http-terminator and instead of using `server.close()`, use `httpTerminator.terminate()`, e.g.

```js
import http from 'http';
import {
  createHttpTerminator,
} from 'http-terminator';

const server = http.createServer();

const httpTerminator = createHttpTerminator({
  server,
});

httpTerminator.terminate();

```

### Usage with express.js

```js
import express from 'express';
import {
  createHttpTerminator,
} from 'http-terminator';

const app = express();

const server = app.listen();

const httpTerminator = createHttpTerminator({
  server,
});

httpTerminator.terminate();

```
