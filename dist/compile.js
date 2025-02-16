"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var scanner_1 = require("./compiler/scanner");
var compile = function (code) {
    var _scanner = (0, scanner_1.scanner)(code);
    console.log('_scanner', _scanner);
};
var code = "var test = 1";
compile(code);
