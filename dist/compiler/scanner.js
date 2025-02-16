"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanner = void 0;
var type_1 = require("./type");
var keywords = {
    "function": type_1.Token.Function,
    "var": type_1.Token.Var,
    "type": type_1.Token.Type,
    "return": type_1.Token.Return,
};
var scanner = function (code) {
    // コードのどの位置を解析しているかを判別する値
    var position = 0;
    // 解析したコードのテキストを格納する値（変数名や文字列など）
    var text = "";
    // 解析したトークンを格納する値
    var token = type_1.Token.BOF;
    // 解析している位置が、コードの長さを超えていないか（最後まで到達していないか）を判別
    // 解析している位置が、引数で受けた解析をする関数の条件に一致しているかを判別
    // 判別した結果、スキップすべき文字列配列に含まれている場合、解析している位置を進める
    function scanForward(pred) {
        while (position < code.length && pred(code.charAt(position))) {
            position++;
        }
    }
    function scan() {
        // 現在解析している位置が、空白・タブ・バックスペース・改行かどうかを判別する
        scanForward(isIgnorableCharacter);
        var start = position;
        // 現在解析している位置が、最後かどうかを判別
        if (position === code.length) {
            token = type_1.Token.EOF;
        }
        // 現在解析している位置が、ダブルオーテーションかどうかを判別
        // ダブルオーテーションで囲まれた値を文字列として判定
        else if (code.charAt(position) === '"') {
            position++;
            scanForward(isDoubleQuotation);
            // ダブルくオーテーションが閉じられているかを判別
            if (code.charAt(position) !== '"') {
                throw new Error("unclosed string literal");
            }
            else {
                position++;
            }
            // ダブルオーテーションで囲まれた文字列を取得
            text = code.slice(start, position);
            token = type_1.Token.StringLiteral;
        }
        // 現在解析している位置が、数値かどうかを判別
        else if (/[0-9]/.test(code.charAt(position))) {
            scanForward(isNumber);
            // 数値の値を取得
            text = code.slice(start, position);
            token = type_1.Token.NumericLiteral;
        }
        // 現在解析している位置が、英数字またはアンダーバーかどうかを判別
        else if (/[_a-zA-Z]/.test(code.charAt(position))) {
            scanForward(isAlphaNumeral);
            // 識別子の値を取得
            text = code.slice(start, position);
            token = text in keywords ? keywords[text] : type_1.Token.Identifier;
        }
        // 現在解析している位置が、ここまでの条件に当てはまらない値の場合
        else {
            position++;
            switch (code.charAt(position - 1)) {
                case '=':
                    // イコールの後に続く文字がアローかどうかを判別
                    if (code.charAt(position) === '>') {
                        position++;
                        token = type_1.Token.Arrow;
                        break;
                    }
                    token = type_1.Token.Equals;
                    break;
                case ',':
                    token = type_1.Token.Comma;
                    break;
                case ';':
                    token = type_1.Token.Semicolon;
                    break;
                case ":":
                    token = type_1.Token.Colon;
                    break;
                case "{":
                    token = type_1.Token.OpenBrace;
                    break;
                case "}":
                    token = type_1.Token.CloseBrace;
                    break;
                case "(":
                    token = type_1.Token.OpenParen;
                    break;
                case ")":
                    token = type_1.Token.CloseParen;
                    break;
                case "<":
                    token = type_1.Token.LessThan;
                    break;
                case ">":
                    token = type_1.Token.GreaterThan;
                    break;
                default:
                    token = type_1.Token.Unknown;
                    break;
            }
        }
    }
    ;
    return {
        scan: scan,
        position: position,
        text: text,
        token: token,
    };
};
exports.scanner = scanner;
// 現在解析している位置が、空白・タブ・バックスペース・改行かどうかを判別する関数
var isIgnorableCharacter = function (charactor) {
    return /[ \t\b\n]/.test(charactor);
};
// 現在解析している位置が、ダブルオーテーションかどうかを判別する関数
var isDoubleQuotation = function (charactor) {
    return /[^\"]/.test(charactor);
};
// 現在解析している位置が、数値かどうかを判別する関数
var isNumber = function (charactor) {
    return /[0-9]/.test(charactor);
};
// 現在解析している位置が、英数字またはアンダーバーかどうかを判別
var isAlphaNumeral = function (charactor) {
    return /[_a-zA-Z]/.test(charactor);
};
