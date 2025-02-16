import { Token } from "../scanner/type";
import type { Scanner } from "../scanner/type";
import { SyntaxKind, Statement, Identifier, Expression, Module, PropertyAssignment, PropertyDeclaration, Object, ObjectLiteralType, Parameter, TypeNode, SignatureDeclaration, TypeParameter, Function } from './type'
import { error } from '../error'

export const parser = (scanner: Scanner) => {
  // 解析を開始する
  scanner.scan()

  // 引数で受け取った値（トークン）と、現在解析しているトークンが一致している時、その値（トークン）をスキップする関数
  function tryParseToken(expected: Token) {
    const ok = scanner.token() === expected
    if (ok) {
      scanner.scan()
    }
    return ok
  }

  // 引数で受け取った値（トークン）が、現在の値（トークン）の位置と一致しているかどうか判別する関数
  function parseExpected(expected: Token) {
    if (!tryParseToken(expected)) {
      error(scanner.position(), `parseToken: Expected ${Token[expected]} but got ${Token[scanner.token()]}`)
    }
  }

  // 第3引数で受け取った値（トークン）が見つかるまで、第1引数の関数を実行し続ける関数
  // 第2引数で受け取った値（トークン）が見つかった場合は、その値（トークン）をスキップする
  function parseTerminated<T>(element: () => T, separator: Token, terminator: Token) {
    const list = []
    while (true) {
      if (tryParseToken(terminator)) {
        break
      }
      else {
        list.push(element())
        tryParseToken(separator)
      }
    }
    return list
  }

  // 現在の値が識別子（Identifier）かリテラル（文字列・数値）であることを確認するための関数
  function parseIdentifierOrLiteral(): Expression {
    const pos = scanner.position()
    const token = scanner.token()
    const text = scanner.text()
    scanner.scan()
    switch (token) {
      case Token.Identifier:
        return { kind: SyntaxKind.Identifier, text, pos, parent: undefined! }
      case Token.NumericLiteral:
        return { kind: SyntaxKind.NumericLiteral, value: +text, pos, parent: undefined! }
      case Token.StringLiteral:
        return { kind: SyntaxKind.StringLiteral, value: text, pos, parent: undefined! }
      default:
        error(pos, "Expected identifier or literal but got " + Token[token] + " with text " + text)
        return { kind: SyntaxKind.Identifier, text: "(missing)", pos, parent: undefined! }
    }
  }

  // 識別子（Identifier）を解析する関数
  // 例）const str = "hello";
  // 例）const num = 100;
  function parseIdentifier(): Identifier {
    const e = parseIdentifierOrLiteral()
    if (e.kind === SyntaxKind.Identifier) {
        return e
    }
    error(e.pos, "Expected identifier but got a literal")
    return { kind: SyntaxKind.Identifier, text: "(missing)", pos: e.pos, parent: undefined! }
  }

  // ":"（コロン）があった場合に、型注釈として解析を行う関数
  function tryParseTypeAnnotation(): TypeNode | undefined {
    if (tryParseToken(Token.Colon)) {
      return parseType()
    }
  }
  
  // オブジェクトの中身を解析する関数
  // const test = { hoge: "fuga" } というオブジェクトの場合、hoge: string として解析する
  function parsePropertyDeclaration(): PropertyDeclaration {
    // オブジェクトのプロパティ名を解析
    const name = parseIdentifierOrLiteral()
    if (name.kind !== SyntaxKind.Identifier) {
      throw new Error("Only identifiers are allowed as property names in deci-typescript")
    }
    // オブジェクトのプロパティの型を解析
    const typename = tryParseTypeAnnotation()
    return { kind: SyntaxKind.PropertyDeclaration, name, typename, pos: name.pos, symbol: undefined!, parent: undefined! }
  }
  
  // オブジェクト全体の型を解析する関数
  // オブジェクトでない場合は、関数型として解析し、関数型でない場合は識別子として解析する
  // 例）type Test = { a: number, b: string };
  function parseType(): TypeNode {
    const pos = scanner.position()
    // オブジェクトの開始位置である "{" の値があることを確認
    if (tryParseToken(Token.OpenBrace)) {
      const object = {
        kind: SyntaxKind.ObjectLiteralType,
        properties: parseTerminated(parsePropertyDeclaration, Token.Comma, Token.CloseBrace),
        symbol: undefined!,
        pos,
        parent: undefined!,
      } as ObjectLiteralType
      object.symbol = { valueDeclaration: undefined, declarations: [object], members: new Map() }
      return object
    }
    // "{" が見つからなかった場合、別の値として解析を行う
    return tryParseSignature() || parseIdentifier()
  }

  // 関数の引数のジェネリック型を解析する関数
  function parseTypeParameter(): TypeParameter {
    const id = parseIdentifier()
    return { kind: SyntaxKind.TypeParameter, name: id, pos: id.pos, symbol: undefined!, parent: undefined!}
  }

  // 関数の引数（Parameter）を解析する関数
  function parseParameter(): Parameter {
    // 引数名を解析
    const name = parseIdentifier()
    // 引数の型を解析
    const typename = tryParseTypeAnnotation()
    return { kind: SyntaxKind.Parameter, name, typename, pos: name.pos, symbol: undefined!, parent: undefined! }
  }

  // 関数の型を解析する関数
  // 例）type Test = (a: number, b: string) => boolean
  function tryParseSignature(): SignatureDeclaration | undefined {
    const pos = scanner.position()
    let typeParameters: TypeParameter[] | undefined
    // "<" が見つかった場合、ジェネリック型として解析を行う
    if (tryParseToken(Token.LessThan)) {
      typeParameters = parseTerminated(parseTypeParameter, Token.Comma, Token.GreaterThan)
      parseExpected(Token.OpenParen)
    }
    // "(" が見つかった場合、引数と戻り値の型を解析する
    if (typeParameters || tryParseToken(Token.OpenParen)) {
      const parameters = parseTerminated(parseParameter, Token.Comma, Token.CloseParen)
      parseExpected(Token.Arrow)
      // 関数の戻り値の型を解析
      const typename = parseType()
      const signature = { 
        kind: SyntaxKind.Signature,
        typeParameters,
        parameters,
        typename,
        locals: new Map(),
        pos,
        symbol: undefined!,
        parent: undefined!,
      } as SignatureDeclaration
      signature.symbol = { valueDeclaration: signature, declarations: [signature] }
      return signature
    }
  }

  // function parseStatement(): Statement {
  //   const pos = scanner.position()
  //   switch (scanner.token()) {
  //     case Token.Var: {
  //       scanner.scan()
  //       const name = parseIdentifier()
  //       const typename = tryParseTypeAnnotation()
  //       parseExpected(Token.Equals)
  //       const initializer = parseExpression()
  //       return { kind: SyntaxKind.Var, name, typename, initializer, pos, symbol: undefined!, parent: undefined! }
  //     }
  //     case Token.Type: {
  //       scanner.scan()
  //       const name = parseIdentifier()
  //       parseExpected(Token.Equals)
  //       const typename = parseType()
  //       return { kind: SyntaxKind.TypeAlias, name, typename, pos, symbol: undefined!, parent: undefined! }
  //     }
  //     case Token.Return: {
  //       scanner.scan()
  //       return { kind: SyntaxKind.Return, expression: parseExpression(), pos, parent: undefined! }
  //     }
  //     default:
  //       return { kind: SyntaxKind.ExpressionStatement, expression: parseExpression(), pos, parent: undefined! }
  //   }
  // }

  // function parseExpression(): Expression {
  //   const expression = parseExpressionBelowCall()
  //   if (tryParseToken(Token.OpenParen)) {
  //     return { kind: SyntaxKind.Call, expression, arguments: parseTerminated(parseExpression, Token.Comma, Token.CloseParen), pos: expression.pos, parent: undefined! }
  //   }
  //   else if (tryParseToken(Token.LessThan)) {
  //     const typeArguments = parseTerminated(parseType, Token.Comma, Token.GreaterThan)
  //     parseExpected(Token.OpenParen)
  //     return { kind: SyntaxKind.Call, expression, typeArguments, arguments: parseTerminated(parseExpression, Token.Comma, Token.CloseParen), pos: expression.pos, parent: undefined! }
  //   }
  //   return expression
  // }

  // function parseExpressionBelowCall(): Expression {
  //   const pos = scanner.position()
  //   if (tryParseToken(Token.OpenBrace)) {
  //     const object = {
  //         kind: SyntaxKind.Object,
  //         properties: parseTerminated(parseProperty, Token.Comma, Token.CloseBrace),
  //         symbol: undefined!,
  //         pos,
  //         parent: undefined!,
  //     } as Object
  //     object.symbol = { valueDeclaration: object, declarations: [object], members: new Map() }
  //     return object
  //   }
  //   else if (tryParseToken(Token.Function)) {
  //     const name = scanner.token() === Token.Identifier ? parseIdentifier() : undefined
  //     const typeParameters = tryParseToken(Token.LessThan) ? parseTerminated(parseTypeParameter, Token.Comma, Token.GreaterThan) : undefined
  //     parseExpected(Token.OpenParen)
  //     const parameters = parseTerminated(parseParameter, Token.Comma, Token.CloseParen)
  //     const typename = tryParseTypeAnnotation()
  //     const body = parseBlock()
  //     const func = { 
  //       kind: SyntaxKind.Function, 
  //       name,
  //       typeParameters,
  //       parameters,
  //       typename,
  //       body,
  //       locals: new Map(),
  //       pos,
  //       symbol: undefined!,
  //       parent: undefined! 
  //     } as Function
  //     func.symbol = { valueDeclaration: func, declarations: [func] }
  //     return func
  //   }
  //   const e = parseIdentifierOrLiteral()
  //   if (e.kind === SyntaxKind.Identifier && tryParseToken(Token.Equals)) {
  //     return { kind: SyntaxKind.Assignment, name: e, value: parseExpression(), pos, parent: undefined! }
  //   }
  //   return e
  // }

  // function parseProperty(): PropertyAssignment {
  //   const name = parseIdentifierOrLiteral()
  //   if (name.kind !== SyntaxKind.Identifier) {
  //     throw new Error("Only identifiers are allowed as property names in deci-typescript")
  //   }
  //   parseExpected(Token.Colon)
  //   const initializer = parseExpression()
  //   return { kind: SyntaxKind.PropertyAssignment, name, initializer, pos: name.pos, symbol: undefined!, parent: undefined! }
  // }

  // function parseBlock(): Statement[] {
  //   parseExpected(Token.OpenBrace)
  //   const statements = parseTerminated(parseStatement, Token.Semicolon, Token.CloseBrace)
  //   return statements
  // }
};
