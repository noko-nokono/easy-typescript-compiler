// 解析している値を識別するためのトークンの種類を管理
export var Token;
(function (Token) {
    Token[Token["Function"] = 0] = "Function";
    Token[Token["Var"] = 1] = "Var";
    Token[Token["Type"] = 2] = "Type";
    Token[Token["Return"] = 3] = "Return";
    Token[Token["Equals"] = 4] = "Equals";
    Token[Token["NumericLiteral"] = 5] = "NumericLiteral";
    Token[Token["StringLiteral"] = 6] = "StringLiteral";
    Token[Token["Identifier"] = 7] = "Identifier";
    Token[Token["Newline"] = 8] = "Newline";
    Token[Token["Semicolon"] = 9] = "Semicolon";
    Token[Token["Comma"] = 10] = "Comma";
    Token[Token["Colon"] = 11] = "Colon";
    Token[Token["Arrow"] = 12] = "Arrow";
    Token[Token["Whitespace"] = 13] = "Whitespace";
    Token[Token["OpenBrace"] = 14] = "OpenBrace";
    Token[Token["CloseBrace"] = 15] = "CloseBrace";
    Token[Token["OpenParen"] = 16] = "OpenParen";
    Token[Token["CloseParen"] = 17] = "CloseParen";
    Token[Token["LessThan"] = 18] = "LessThan";
    Token[Token["GreaterThan"] = 19] = "GreaterThan";
    Token[Token["Unknown"] = 20] = "Unknown";
    Token[Token["BOF"] = 21] = "BOF";
    Token[Token["EOF"] = 22] = "EOF";
})(Token || (Token = {}));
//# sourceMappingURL=type.js.map