// @ts-check
"use strict";

/**
 * @typedef { {
 *    argv: string[];
 *    env: {[key: string]: string | undefined};
 *    chdir (cwd: string): void;
 *    cwd (): string;
 *    exit (err?: number): void;
 * } } ProcessType
 * @typedef { {
 *    [ind: number]: number; length: number;
 *    toString (encoding?: string, start?: number, end?: number): string;
 * } } Buffer
 * @typedef { {
 *    size: number;
 *    mtime: Date; atime: Date;
 *    isDirectory (): boolean;
 * } } FileStat
 * @typedef { {
 *    openSync (path: string, method: "a" | "r" | "w"): number;
 *    fstatSync (fd: number): FileStat;
 *    futimesSync (fd: number, atime: number, mtime: number): void;
 *    close (fd: number): void;
 *    closeSync (fd: number): void;
 *    existsSync (path: string): boolean;
 *    statSync (path: string): FileStat;
 *    mkdirSync (path: string, options?: {recursive?: boolean}): void;
 *    readFileSync (path: string): Buffer;
 *    writeFile (path: string, data: string | Buffer, callback?: (err?: Error) => void): void;
 *    writeFileSync (path: string, data: string | Buffer): void;
 *    createReadStream (path: string): any;
 * } } FileSystem
 * 
 * @typedef { {
 *    compress: any; output: any; mangle: any; ecma?: 5 | 2015 | 2016 | 2017 | 2018;
 * } } TerserOptions
 */
/** @type {FileSystem} */
// @ts-ignore
var fs = require("fs");
var fsPath = require("path");
var projectRoot = fsPath.dirname(fsPath.dirname(__filename)).replace(/\\/g, "/");

/**
 * Read file to string and remember info like BOM (support utf-8 / utf16le)
 * @param {string} fileName - file path
 * @param { { bom?: "\uFFFE" | "\uFEFF" | "" } | null } [info] - object to store extra info
 * @returns {string} file text content
 */
function readFile(fileName, info) {
  info == null && (info = {});
  var buffer = fs.readFileSync(fileName);
  var len = buffer.length;
  // console.log("[DEBUG] read %o (%o bytes)", fileName, len);
  if (len >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
      // Big endian UTF-16 byte order mark detected. Since big endian is not supported by node.js,
      // flip all byte pairs and treat as little endian.
      len &= ~1;
      for (var i = 0; i < len; i += 2) {
          var temp = buffer[i];
          buffer[i] = buffer[i + 1];
          buffer[i + 1] = temp;
      }
      info.bom = "\uFFFE";
      return buffer.toString("utf16le", 2);
  }
  if (len >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
      // Little endian UTF-16 byte order mark detected
      info.bom = "\uFEFF";
      return buffer.toString("utf16le", 2);
  }
  if (len >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      // UTF-8 byte order mark detected
      info.bom = "\uFEFF";
      return buffer.toString("utf8", 3);
  }
  info.bom = "";
  // Default is UTF-8 with no byte order mark
  return buffer.toString("utf8");
}

/**
 * @callback ReadJson
 * @param {string} fileName - file path
 * @param {boolean} [throwError]
 * @returns {any} parsed JSON object
 */
/** @type {ReadJson} */
var _readJSON;

/**
 * Read json file to any object or throw error
 * @type {ReadJson}
 * @param {boolean} [throwError] - throw on error or just log it
 */
function readJSON(fileName, throwError) {
  if (!_readJSON) {
    _makeJSONReader();
  }
  return _readJSON(fileName, throwError);
}

function _makeJSONReader() {
  var stringOrComment = /"(?:\\[\\\"]|[^"])*"|'(?:\\[\\\']|[^'])*'|\/\/[^\r\n]*|\/\*[^]*?\*\//g
    , notLF = /[^\r\n]+/g, notWhiteSpace = /\S/;
  /** @type { {[path: string]: string} } */
  var cached = {};
  /** @param {string} str */
  function spaceN(str) {
    return ' '.repeat(str.length);
  }
  /** @param {string} str */
  function onReplace(str) {
    switch (str[0]) {
    case '/': case '#':
      if (str.slice(0, 2) === "/*") {
        // replace comments with whitespace to preserve original character positions
        return str.replace(notLF, spaceN);
      }
      return spaceN(str);
    case '"': case "'": // falls through
    default:
      return str;
    }
  }
  /** @type {ReadJson} */
  function readJSON1(fileName, throwError) {
    fileName = fileName.replace(/\\/g, "/");
    /** @type string | undefined */
    var text = cached[fileName];
    if (text == null) {
      text = readFile(fileName);
      text = text.replace(stringOrComment, onReplace);
      cached[fileName] = text;
    }
    try {
      return notWhiteSpace.test(text) ? JSON.parse(text) : {};
    } catch (e) {
      if (throwError === true) {
        throw e;
      }
      var err = "Failed to parse file '" + fileName + "': " + e + ".";
      console.warn("%s", err);
      return {};
    }
  }
  _readJSON = readJSON1;
}

var _uglifyjsConfig = null, _configWarningLogged = false;

/**
 * Load configuration of UglifyJS or terser
 * @param {string} path - file path
 * @param {boolean} [reload] - force to reload or return the cache if possible
 * @returns {TerserOptions} parsed configuration object
 */
function loadUglifyConfig(path, reload) {
  var a = _uglifyjsConfig;
  if (a == null || reload) {
    a = readJSON(path);
    if (!reload) {
      _uglifyjsConfig = a;
    }
    var o = a.output || (a.output = {});
    var c = a.compress || (a.compress = {}); // gd = c.global_defs || (c.global_defs = {});
    function ToRegExp(literal) {
      var re = literal.match(/^\/(.*)\/([a-z]*)$/);
      return re ? new RegExp(re[1], re[2]) : literal;
    }
    if (typeof c.keep_fnames === "string") {
      c.keep_fnames = ToRegExp(c.keep_fnames);
    }
    var m = a.mangle, p = m && m.properties;
    if (p && typeof p.regex === "string") {
      p.regex = ToRegExp(p.regex);
    }
    if (m && typeof m.keep_fnames === "string") {
      m.keep_fnames = ToRegExp(m.keep_fnames);
    }
    else if (m && !m.keep_fnames) {
      m.keep_fnames = c.keep_fnames;
    }
    var comments = o.comments;
    if (comments && typeof comments === "string") {
      o.comments = ToRegExp(comments);
    }
    patchTerser();
    var ver = "", terser = null;
    try {
      ver = require("terser/package.json").version;
    } catch (e) {
      console.log("Can not read the version of terser.");
    }
    try {
      // @ts-ignore
      terser = require("terser");
    } catch (e) {
      console.log("Can not read the module of terser.");
    }
    if (ver) {
      if (m) {
          if (p.undeclared == null) {
            p.undeclared = true;
          }
      }
    }
    // @ts-ignore
    if (terser && terser.default_options) {
      // @ts-ignore
      var allowed = terser.default_options();
      if (allowed) {
        var allowedKeys = new Set(Object.keys(allowed.compress)), skipped = [];
        for (var key1 in c) {
          if (!allowedKeys.has(key1)) {
            skipped.push(key1);
            delete c[key1];
          }
        }
        if (skipped.length > 0 && !_configWarningLogged) {
          _configWarningLogged = true;
          require("fancy-log")(`Skip these terser options: ${skipped.join(", ")}`);
        }
      }
    }
  }
  return a;
}

/**
 * Touch a file if it's older than `fileToCompareTime`
 * @param {string} targetPath - target file to check and touch
 * @param {string} [fileToCompareTime] - source file to compare its mtime
 * @param {boolean} [virtual] - whether to skip real actions
 * @returns {boolean | null} whether it's needed to touch or not
 */
function touchFileIfNeeded(targetPath, fileToCompareTime, virtual) {
  if (fileToCompareTime === targetPath) { fileToCompareTime = null; }
  if (!fs.existsSync(targetPath) || fileToCompareTime && !fs.existsSync(fileToCompareTime)) {
    return null;
  }
  var fd = fs.openSync(targetPath, "a"), fd2 = null;
  try {
    var stat = fs.fstatSync(fd);
    if (stat.mtime != null && fileToCompareTime) {
      var srcMtime = fs.fstatSync(fd2 = fs.openSync(fileToCompareTime, "r")).mtime;
      if (srcMtime != null && srcMtime < stat.mtime) {
        return false;
      }
    }
    virtual ||
    // @ts-ignore
    fs.futimesSync(fd, parseInt(stat.atime.getTime() / 1000, 10), parseInt(Date.now() / 1000, 10));
  } finally {
    fs.closeSync(fd);
    if (fd2 != null) {
      fs.closeSync(fd2);
    }
  }
  return true;
}

/**
 * Compare modification time of two files
 * @param {string} src - source file
 * @param {string} dest - target file
 * @returns {boolean} whether src is older than dest or not
 */
function compareFileTime(src, dest) {
  return touchFileIfNeeded(dest, src, true) === false;
}

/**
 * Copy members of `a` into `b`
 * @template T
 * @param {T} b - dest object
 * @param {Partial<T>} a - source object
 * @return {T} b
 */
function extendIf(b, a) {
  Object.setPrototypeOf(a, null);
  for (var i in a) {
    (i in b) || (b[i] = a[i]);
  }
  return b;
}

/**
 * Get git commit id (7-character version) or null
 * @argument {number} maxLen
 * @return {string | null}
 */
function getGitCommit(maxLen) {
  try {
    var branch = readFile(".git/HEAD");
    branch = branch && branch.trim();
    /** @type {string | undefined} */
    var commit;
    if (!branch.startsWith("ref:") && branch.length >= 32) {
      commit = branch;
    } else if (branch.startsWith("ref:") && branch.length > 4) {
      commit = readFile(".git/" + branch.slice(4).trim());
    }
    return commit ? commit.trim().slice(0, maxLen > 0 ? maxLen : maxLen < 0 ? commit.length : 7) : null;
  } catch (e) {}
  return null;
}

/**
 * 
 * @param {string} source
 * @param {boolean} locally
 * @param {{ (...args: any[]): any; error(message: string): any; }} [logger]
 * @returns { [string, string, string] | string }
 */
function patchExtendClick(source, locally, logger) {
  logger && logger('Patch the extend_click module');
  source = source.replace(/\b(addEventListener|toString) ?: ?function ?\w*/g, "$1");
  var match = /\/: \?function \\w\+\/g, ?(""|'')/.exec(source);
  if (match) {
    var start = Math.max(0, match.index - 128), end = match.index;
    var prefix = source.slice(0, start), suffix = source.slice(end);
    /** {@see #BrowserVer.MinEnsuredES6MethodFunction} */
    source = source.slice(start, end).replace(/>= ?45/, "< 45").replace(/45 ?<=/, "45 >");
    suffix = '/\\b(addEventListener|toString)\\(/g, "$1:function $1("' + suffix.slice(match[0].length);
    source = prefix + source + suffix;
  }
  match = /' ?\+ ?\(?function VC ?\(/.exec(source);
  if (match) {
    var start = match.index;
    var end1 = source.indexOf('}).toString()', start) + 1 || source.indexOf('}.toString()', start) + 1;
    var end2 = source.indexOf('")();"', end1 + 2) + 1 || source.indexOf("')();'", end1 + 2) + 1;
    if (end2 <= 0) {
      throw new Error('Can not find the end ".toString() + \')();\'" around the injected function.');
    }
    var prefix = source.slice(0, start), suffix = "'" + source.slice(end2 + ")();'".length);
    source = source.slice(start + match[0].length, end1).replace(/ \/\/[^\n]*?$/g, "").replace(/'/g, '"');
    source = source.replace(/\\/g, "\\\\");
    if (locally) {
      source = source.replace(/([\r\n]) {4}/g, "$1").replace(/\r\n?|\n/g, "\\n\\\n");
    } else {
      source = source.replace(/[\r\n]\s*/g, "");
    }
    source = "function(" + source + ")()";
    const sourceHead = '"use strict";(';
    if (prefix.endsWith(sourceHead)) {
      prefix = prefix.slice(0, -sourceHead.length);
      source = sourceHead + source;
    }
    return [prefix, source, suffix];
  } else if (! (/(=|\?|:|\|\|) ?'"use strict";\(function\b/).test(source)) {
    throw Error("Error: can not wrap extend_click scripts!!!");
  }
  return source;
}

/**
 * @argument {string} filePath
 * @argument {{ (...args: any[]): any; error(message: string): any; }} logger
 * @returns {boolean} whether successful or not
 */
function logFileSize(filePath, logger) {
  try {
    var fd = fs.openSync(filePath, "r"),
    size = fs.fstatSync(fd).size;
    fs.close(fd);
    logger("%o: %o bytes = %o KB", filePath, size, ((size / 1024 * 100 + 0.5) | 0) / 100);
    return true;
  } catch (e) {
    logger.error('fail to read "' + filePath + '": ' + e);
    return false;
  }
}

/**
 * @param {string} path
 * @param {string} data
 * @return {string}
 */
function addMetaData(path, data) {
  const isAMDModule = data.startsWith("define") || data.startsWith("(factory")
      || data.startsWith("(function(factory)") || data.startsWith("(function (factory)");
  if (!isAMDModule) { return data; }
  path = path.replace(/\\/g, "/").replace(projectRoot, "").replace(/^\//, "")
  var banner = "var __filename = " + JSON.stringify(path) + ";\n";
  return banner + data;
}

/**
 * @param { string } code 
 * @returns { string }
 */
function inlineAllSetters (code) {
  const allNames = code.match(/\bset_\w+\b/g);
  for (let i = 0; i < allNames.length; i++) {
    const name = allNames[i].slice(4);
    if (!new RegExp("\\b" + name + " ?=").test(code)) {
      throw new Error('Can not find symbol "' + name + '"');
    }
  }
  return code.replace(/\bset_(\w+)\(([^\n]+)/g, function (fullStr, name, data, ind) {
    var parenthesis = 1;
    if (code.slice(ind - 16, ind).trim().endsWith("function")) {
      return fullStr;
    }
    for (var i = 0; i < data.length; i++) {
      if (data[i] === "(") { parenthesis++; }
      else if (data[i] === ")") {
        parenthesis--;
        if (parenthesis === 0) {
          break;
        }
      }
    }
    return "(" + name + " = " + data;
  });
}

/**
 * @argument {any} ts
 * @param {{ (...args: any[]): any; error(message: string): any; }} [logger]
 * @argument {boolean} [noGenerator]
 * @argument {boolean} [wrapGeneratorToken]
 */
function patchTSNamespace (ts, logger, noGenerator, wrapGeneratorToken) {
  var key, bak = "_bak_"

  key = "transformGenerators"
  var logged1 = false
  var originalTransGen = ts[bak + key] || ts[key]
  var notTransformGenerator = function (_context) {
    if (!logged1) {
      logged1 = true;
      (logger || console.log)("Not transform ES6 generators");
    }
    return function (node) { return node; };
  }
  ts[bak + key] = noGenerator ? originalTransGen : null
  ts[key] = noGenerator ? notTransformGenerator : originalTransGen

  key = "createPropertyAccessExpression"
  var originalPropAccExpr = ts.factory[bak + key] || ts.factory[key]
  if (originalPropAccExpr) {
    var wrappedAccessPropExpr = function (_expression, name) {
      var args = [].slice.call(arguments, 0)
      args[1] = name === "label" ? "label_" : name === "sent" ? "sent_" : name
      return originalPropAccExpr.apply(this, args)
    }
    ts.factory[bak + key] = wrapGeneratorToken ? originalPropAccExpr : null
    ts.factory[key] = wrapGeneratorToken ? wrappedAccessPropExpr : originalPropAccExpr
  }
  key = "createPropertyAccess"
  var originalAccessProp = ts[bak + key] || ts[key]
  if (originalAccessProp) {
    var wrappedAccessProp = function (_expression, name) {
      var args = [].slice.call(arguments, 0)
      args[1] = name === "label" ? "label_" : name === "sent" ? "sent_" : name
      return originalAccessProp.apply(this, args)
    }
    ts[bak + key] = wrapGeneratorToken ? originalAccessProp : null
    ts[key] = wrapGeneratorToken ? wrappedAccessProp : originalAccessProp
  }
}

let __terserPatched = false
function patchTerser() {
  if (__terserPatched) { return }
  __terserPatched = true
  let path = "node_modules/terser/package.json"
  let i = 0
  for (; i < 4 && !fs.existsSync(path); i++) { path = "../" + path; }
  if (i > 4) { return } // no terser installed
  const terserPackage = readJSON(path)
  if (!terserPackage.exports) { return }
  let mod = false
  for (const i of ["./lib/parse", "./lib/ast"]) {
    if (!terserPackage.exports[i]) {
      mod = true
      terserPackage.exports[i] = i + ".js"
    }
  }
  if (mod) {
    require("fs").writeFileSync(path, JSON.stringify(terserPackage, null, 2))
    delete require.cache[require('path').resolve(path)]
    require("fancy-log")("Patch terser/package.json: succeed");
  }
}

module.exports = {
  readFile: readFile,
  readJSON: readJSON,
  loadUglifyConfig: loadUglifyConfig,
  touchFileIfNeeded: touchFileIfNeeded,
  compareFileTime: compareFileTime,
  extendIf: extendIf,
  getGitCommit: getGitCommit,
  patchExtendClick: patchExtendClick,
  addMetaData: addMetaData,
  logFileSize: logFileSize,
  inlineAllSetters: inlineAllSetters,
  patchTSNamespace: patchTSNamespace,
  patchTerser: patchTerser,
};
