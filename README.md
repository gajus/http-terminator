<a name="http-terminator"></a>
# http-terminator 🦾

[![Travis build status](http://img.shields.io/travis/gajus/http-terminator/master.svg?style=flat-square)](https://travis-ci.org/gajus/http-terminator)
[![Coveralls](https://img.shields.io/coveralls/gajus/http-terminator.svg?style=flat-square)](https://coveralls.io/github/gajus/http-terminator)
[![NPM version](http://img.shields.io/npm/v/http-terminator.svg?style=flat-square)](https://www.npmjs.org/package/http-terminator)
[![Canonical Code Style](https://img.shields.io/badge/code%20style-canonical-blue.svg?style=flat-square)](https://github.com/gajus/canonical)
[![Twitter Follow](https://img.shields.io/twitter/follow/kuizinas.svg?style=social&label=Follow)](https://twitter.com/kuizinas)

Terminates HTTP server.

* [http-terminator 🦾](#http-terminator)
    * [Usage](#http-terminator-usage)
        * [Usage with express.js](#http-terminator-usage-usage-with-express-js)


<a name="http-terminator-usage"></a>
## Usage

Use `createHttpTerminator` to create an instance of http-terminator. Close HTTP server as usual (`server.close()`) and follow up with `httpTerminator.terminate()`, e.g.

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

<a name="http-terminator-usage-usage-with-express-js"></a>
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
