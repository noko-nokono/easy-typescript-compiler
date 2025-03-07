import { Token } from "../scanner/type.js";
import { SyntaxKind } from './type.js';
import { error } from '../error.js';
/**
 * [全体像]
 * 1. parseModuleでプログラム全体を解析を開始する
 * 2. parseStatementでプログラムの各文を解析する（var, type, return）
 *    - var: 変数宣言を解析する
 *    - type: 型宣言を解析する
 *    - return: return文を解析する
 * 3. parseExpressionでプログラムの式を解析する（object, function, etc...）
 *    - オブジェクトリテラル ({ key: value }) を解析する
 *    - 関数定義 (function name(...) { ... }) を解析する
 *    - 識別子（変数名など）や リテラル（数値や文字列）を解析する
 *    - 代入式 (x = 10) を解析する
 */
export const parser = (scanner) => {
    // 解析を開始する
    scanner.scan();
    return parseModule();
    // プログラム全体を解析する関数
    // プログラム終了を示す EOF まで解析を行う
    function parseModule() {
        const statements = parseTerminated(parseStatement, Token.Semicolon, Token.EOF);
        return { kind: SyntaxKind.Module, statements, locals: new Map(), pos: 0, parent: undefined };
    }
    // コードの文を構成する要素の解析する関数（var, Type, return）
    function parseStatement() {
        const pos = scanner.position();
        // 現在の解析位置からどのように解析を行うかを判別する
        switch (scanner.token()) {
            // 変数宣言を解析する（var）
            case Token.Var: {
                scanner.scan();
                const name = parseIdentifier();
                const typename = tryParseTypeAnnotation();
                parseExpected(Token.Equals);
                const initializer = parseExpression();
                return { kind: SyntaxKind.Var, name, typename, initializer, pos, symbol: undefined, parent: undefined };
            }
            // 型宣言を解析する（type）
            case Token.Type: {
                scanner.scan();
                const name = parseIdentifier();
                parseExpected(Token.Equals);
                const typename = parseType();
                return { kind: SyntaxKind.TypeAlias, name, typename, pos, symbol: undefined, parent: undefined };
            }
            // return文を解析する（return）
            case Token.Return: {
                scanner.scan();
                return { kind: SyntaxKind.Return, expression: parseExpression(), pos, parent: undefined };
            }
            // その他、オブジェクト・関数・識別子・リテラル（文字列・数値）などを解析する
            default:
                return { kind: SyntaxKind.ExpressionStatement, expression: parseExpression(), pos, parent: undefined };
        }
    }
    // オブジェクト・関数・識別子・リテラル（文字列・数値）を解析し、加えて関数呼び出しを解析する関数
    function parseExpression() {
        // オブジェクト・関数・識別子・リテラル（文字列・数値）を開始する
        const expression = parseExpressionBelowCall();
        // 通常の関数呼び出しを解析する（関数を実行している箇所を指す）
        // 例）add(1, 2);
        if (tryParseToken(Token.OpenParen)) {
            return { kind: SyntaxKind.Call, expression, arguments: parseTerminated(parseExpression, Token.Comma, Token.CloseParen), pos: expression.pos, parent: undefined };
        }
        // ジェネリック型の関数呼び出しを解析する（関数を実行している箇所を指す）
        else if (tryParseToken(Token.LessThan)) {
            const typeArguments = parseTerminated(parseType, Token.Comma, Token.GreaterThan);
            parseExpected(Token.OpenParen);
            return { kind: SyntaxKind.Call, expression, typeArguments, arguments: parseTerminated(parseExpression, Token.Comma, Token.CloseParen), pos: expression.pos, parent: undefined };
        }
        return expression;
    }
    // オブジェクト・関数・識別子・リテラル（文字列・数値）の判別を行う関数
    function parseExpressionBelowCall() {
        const pos = scanner.position();
        // オブジェクトの開始位置である "{" の値があることを確認
        // 例）var obj = { x: 1, y: 2 };
        if (tryParseToken(Token.OpenBrace)) {
            const object = {
                kind: SyntaxKind.Object,
                properties: parseTerminated(parseProperty, Token.Comma, Token.CloseBrace),
                symbol: undefined,
                pos,
                parent: undefined,
            };
            object.symbol = { valueDeclaration: object, declarations: [object], members: new Map() };
            return object;
        }
        // 関数の開始位置である "function" の値があることを確認
        // 例）function add(a: number, b: number): number { return a + b; }
        else if (tryParseToken(Token.Function)) {
            const name = scanner.token() === Token.Identifier ? parseIdentifier() : undefined;
            // "<" が見つかった場合、ジェネリック型として解析を行う
            const typeParameters = tryParseToken(Token.LessThan) ? parseTerminated(parseTypeParameter, Token.Comma, Token.GreaterThan) : undefined;
            parseExpected(Token.OpenParen);
            // 関数の引数（Parameter）を解析
            const parameters = parseTerminated(parseParameter, Token.Comma, Token.CloseParen);
            // ":"（コロン）があった場合に、型注釈として解析
            const typename = tryParseTypeAnnotation();
            // 関数のブロック内のコードを解析
            const body = parseBlock();
            const func = {
                kind: SyntaxKind.Function,
                name,
                typeParameters,
                parameters,
                typename,
                body,
                locals: new Map(),
                pos,
                symbol: undefined,
                parent: undefined
            };
            func.symbol = { valueDeclaration: func, declarations: [func] };
            return func;
        }
        // 値が識別子（Identifier）かリテラル（文字列・数値）であることを確認
        const e = parseIdentifierOrLiteral();
        if (e.kind === SyntaxKind.Identifier && tryParseToken(Token.Equals)) {
            return { kind: SyntaxKind.Assignment, name: e, value: parseExpression(), pos, parent: undefined };
        }
        return e;
    }
    // 識別子（Identifier）を解析する関数
    // 例）var str = "hello";
    // 例）var num = 100;
    function parseIdentifier() {
        const e = parseIdentifierOrLiteral();
        if (e.kind === SyntaxKind.Identifier) {
            return e;
        }
        error(e.pos, "Expected identifier but got a literal");
        return { kind: SyntaxKind.Identifier, text: "(missing)", pos: e.pos, parent: undefined };
    }
    // 現在の値が識別子（Identifier）かリテラル（文字列・数値）であることを確認するための関数
    function parseIdentifierOrLiteral() {
        const pos = scanner.position();
        const token = scanner.token();
        const text = scanner.text();
        scanner.scan();
        switch (token) {
            case Token.Identifier:
                return { kind: SyntaxKind.Identifier, text, pos, parent: undefined };
            case Token.NumericLiteral:
                return { kind: SyntaxKind.NumericLiteral, value: +text, pos, parent: undefined };
            case Token.StringLiteral:
                return { kind: SyntaxKind.StringLiteral, value: text, pos, parent: undefined };
            default:
                error(pos, "Expected identifier or literal but got " + Token[token] + " with text " + text);
                return { kind: SyntaxKind.Identifier, text: "(missing)", pos, parent: undefined };
        }
    }
    // オブジェクト全体の型を解析する関数
    // オブジェクトでない場合は、関数型として解析し、関数型でない場合は識別子として解析する
    // 例）type Test = { a: number, b: string };
    function parseType() {
        const pos = scanner.position();
        // オブジェクトの開始位置である "{" の値があることを確認
        if (tryParseToken(Token.OpenBrace)) {
            const object = {
                kind: SyntaxKind.ObjectLiteralType,
                properties: parseTerminated(parsePropertyDeclaration, Token.Comma, Token.CloseBrace),
                symbol: undefined,
                pos,
                parent: undefined,
            };
            object.symbol = { valueDeclaration: undefined, declarations: [object], members: new Map() };
            return object;
        }
        // "{" が見つからなかった場合、別の値として解析を行う
        return tryParseSignature() || parseIdentifier();
    }
    // オブジェクトのプロパティを解析する関数
    // 例）{ key: value } の key: value の部分を解析する
    function parseProperty() {
        const name = parseIdentifierOrLiteral();
        if (name.kind !== SyntaxKind.Identifier) {
            throw new Error("Only identifiers are allowed as property names in deci-typescript");
        }
        parseExpected(Token.Colon);
        const initializer = parseExpression();
        return { kind: SyntaxKind.PropertyAssignment, name, initializer, pos: name.pos, symbol: undefined, parent: undefined };
    }
    // オブジェクトの中身の型を解析する関数
    // var test = { hoge: "fuga" } というオブジェクトの場合、hoge: string として解析する
    function parsePropertyDeclaration() {
        // オブジェクトのプロパティ名を解析
        const name = parseIdentifierOrLiteral();
        if (name.kind !== SyntaxKind.Identifier) {
            throw new Error("Only identifiers are allowed as property names in deci-typescript");
        }
        // オブジェクトのプロパティの型を解析
        const typename = tryParseTypeAnnotation();
        return { kind: SyntaxKind.PropertyDeclaration, name, typename, pos: name.pos, symbol: undefined, parent: undefined };
    }
    // 関数の引数（Parameter）の型を解析する関数
    function parseTypeParameter() {
        const id = parseIdentifier();
        return { kind: SyntaxKind.TypeParameter, name: id, pos: id.pos, symbol: undefined, parent: undefined };
    }
    // 関数の引数（Parameter）を解析する関数
    function parseParameter() {
        // 引数名を解析
        const name = parseIdentifier();
        // 引数の型を解析
        const typename = tryParseTypeAnnotation();
        return { kind: SyntaxKind.Parameter, name, typename, pos: name.pos, symbol: undefined, parent: undefined };
    }
    // ブロック内のコードの文を構成する要素の解析する関数
    // { ... } の中身を解析する
    function parseBlock() {
        parseExpected(Token.OpenBrace);
        const statements = parseTerminated(parseStatement, Token.Semicolon, Token.CloseBrace);
        return statements;
    }
    // 関数の型を解析する関数
    // 例）type Test = (a: number, b: string) => boolean
    function tryParseSignature() {
        const pos = scanner.position();
        let typeParameters;
        // "<" が見つかった場合、ジェネリック型として解析を行う
        if (tryParseToken(Token.LessThan)) {
            typeParameters = parseTerminated(parseTypeParameter, Token.Comma, Token.GreaterThan);
            parseExpected(Token.OpenParen);
        }
        // "(" が見つかった場合、引数と戻り値の型を解析する
        if (typeParameters || tryParseToken(Token.OpenParen)) {
            const parameters = parseTerminated(parseParameter, Token.Comma, Token.CloseParen);
            parseExpected(Token.Arrow);
            // 関数の戻り値の型を解析
            const typename = parseType();
            const signature = {
                kind: SyntaxKind.Signature,
                typeParameters,
                parameters,
                typename,
                locals: new Map(),
                pos,
                symbol: undefined,
                parent: undefined,
            };
            signature.symbol = { valueDeclaration: signature, declarations: [signature] };
            return signature;
        }
    }
    //  -------------------------- 以下解析のためのutility関数 --------------------------
    // 引数で受け取った値（トークン）と、現在解析しているトークンが一致している時、その値（トークン）をスキップする関数
    function tryParseToken(expected) {
        const ok = scanner.token() === expected;
        if (ok) {
            scanner.scan();
        }
        return ok;
    }
    // 引数で受け取った値（トークン）が、現在の値（トークン）の位置と一致しているかどうか判別する関数
    function parseExpected(expected) {
        if (!tryParseToken(expected)) {
            error(scanner.position(), `parseToken: Expected ${Token[expected]} but got ${Token[scanner.token()]}`);
        }
    }
    // 第3引数で受け取った値（トークン）が見つかるまで、第1引数の関数を実行し続ける関数
    // 第2引数で受け取った値（トークン）が見つかった場合は、その値（トークン）をスキップする
    function parseTerminated(element, separator, terminator) {
        const list = [];
        while (true) {
            if (tryParseToken(terminator)) {
                break;
            }
            else {
                list.push(element());
                tryParseToken(separator);
            }
        }
        return list;
    }
    // ":"（コロン）があった場合に、型注釈として解析を行う関数
    function tryParseTypeAnnotation() {
        if (tryParseToken(Token.Colon)) {
            return parseType();
        }
    }
};
//# sourceMappingURL=index.js.map