const path = require('path');
const fs = require('fs');
const babylon = require('babylon'); // 生成AST
const traverse = require('@babel/traverse').default; // 解析AST
const babel = require('babel-core');

const resolve = (...paths) => path.resolve(...paths);

class Compiler {
  constructor(config, options) {
    const {
      entry = '',
      output = {
        path: 'dist',
        filename: 'app.bundle.js'
      }
    } = config;
    const {
      execRoot = process.cwd()
    } = options;
    this.execRoot = execRoot;
    this.entry = resolve(this.execRoot, entry);
    const splitedEntry = entry.split('/');
    this.entryId = './' + splitedEntry.pop();
    this.entryDir = splitedEntry.join('/');
    this.modules = {};
    this.output = {
      path: resolve(this.execRoot, output.path),
      filename: output.filename
    };
    this.output.filename = resolve(this.output.path, output.filename)

    // console.log('this.entry: ', this.entry);
    // console.log('this.output: ', this.output);
  }

  buildSource(moduleId = '') {
    // 错误边界处理
    if (!moduleId) return;

    const content = fs.readFileSync(resolve(this.execRoot, this.entryDir, moduleId), 'utf-8');
    console.log('moduleId: ', moduleId);
    // console.log('content: ', content);

    const ast = babylon.parse(content, {
      sourceType: 'module'
    });

    const self = this;
    traverse(ast, {
      ImportDeclaration({ node }) {
        // console.log('node: ', node);
        if (node.source.value) {
          self.buildSource(node.source.value);
        }
      }
    });

    const { code } = babel.transformFromAst(ast, null, {
      presets: ['env']
    });
    // console.log('code: ', code);

    // 生成模块依赖图
    this.modules[moduleId] = code;
  }

  run() {
    // 构建依赖
    this.buildSource(this.entryId);
    console.log('this.modules: ', this.modules);
    this.emit();
  }

  emit() {
    const codes = `
(function(modules) {
  function require(moduleId) {
    const moduleFn = modules[moduleId];
    const module = {
      exports: {}
    };
    moduleFn(require, module, module.exports);
    return module.exports;
  }
  require(${JSON.stringify(this.entryId)});
})({${
  Object.keys(this.modules).map(moduleKey => `"${moduleKey}": function(require, module, exports) {\n${this.modules[moduleKey]}\n}`).join(',\n')
}});
`.trim();

    if (fs.existsSync(this.output.filename)) {
      fs.rmSync(this.output.filename);
      fs.rmdirSync(this.output.path);
    }
    fs.mkdirSync(this.output.path);
    fs.writeFileSync(this.output.filename, codes, 'utf-8');
  }
}

module.exports = Compiler;
