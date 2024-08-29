#! /usr/bin/env node

const path = require('path');

const Compiler = require('../lib/compiler');

const execRoot = process.cwd();
const config = require(
  path.resolve(execRoot, './webpack.config.js')
);

console.log('config: ', config);

const compiler = new Compiler(config, { execRoot });

compiler.run();
