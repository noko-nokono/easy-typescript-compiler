import { Statement, SyntaxKind, Expression, PropertyAssignment, Parameter, TypeNode } from '../parser/type.js'

/**
 * [全体像]
 * 1. emitter関数でプログラム全体の変換を開始する
 * 
 */
export function emitter(statements: Statement[]) {
  // 各文（Statement）にセミコロン「;」と改行「\n」でつなげてコードとしての出力を生成
  return statements.map(emitStatement).join(";\n")
}

// 各文（Statement）を文字列に変換する関数
// その文字列をファイルに書き込むことで、最終的なコードを生成する
function emitStatement(statement: Statement): string {
  switch (statement.kind) {
    // 式文の場合
    case SyntaxKind.ExpressionStatement:
      return emitExpression(statement.expression)
    // 変数宣言の場合
    case SyntaxKind.Var:
      const typestring = statement.typename ? ": " + statement.name : ""
      return `var ${statement.name.text}${typestring} = ${emitExpression(statement.initializer)}`
    // 型定義の場合
    case SyntaxKind.TypeAlias:
      return `type ${statement.name.text} = ${emitType(statement.typename)}`
    // return 文の場合
    case SyntaxKind.Return:
      return `return ${emitExpression(statement.expression)}`
    default:
      throw new Error(`Unhandled statement kind: ${statement}`)
  }
}

// 型を文字列に変換する関数
function emitType(type: TypeNode): string {
  switch (type.kind) {
    // 識別子の場合
    case SyntaxKind.Identifier:
      return type.text
    // オブジェクトリテラル型の場合
    case SyntaxKind.ObjectLiteralType:
      return "not done yet!"
    // 関数シグネチャの場合
    case SyntaxKind.Signature:
      return "not done yet!"
    default:
      throw new Error(`Unknown type kind: ${type}`)
  }
}

// 式（Expression）を文字列に変換する関数
function emitExpression(expression: Expression): string {
  switch (expression.kind) {
    // 識別子の場合
    case SyntaxKind.Identifier:
      return expression.text
    // 数値リテラルの場合
    case SyntaxKind.NumericLiteral:
      return ""+expression.value
    // 文字列リテラルの場合
    case SyntaxKind.StringLiteral:
      return expression.value
    // 代入式の場合
    case SyntaxKind.Assignment:
      return `${expression.name.text} = ${emitExpression(expression.value)}`
    // オブジェクトの場合
    case SyntaxKind.Object:
      return `{ ${expression.properties.map(emitProperty).join(", ")} }`
    // 関数の場合
    case SyntaxKind.Function:
      return `function ${expression.name ? expression.name.text : ""}(${expression.parameters.map(emitParameter).join(", ")}) {
  ${expression.body.map(emitStatement).join(";\n    ")}
}`
    // 関数呼び出しの場合
    case SyntaxKind.Call:
      return `${emitExpression(expression.expression)}(${expression.arguments.map(emitExpression).join(", ")})`
    default:
      throw new Error(`Unknown expression kind: ${expression}`)
  }
}

// オブジェクトのプロパティを文字列に変換する関数
function emitProperty(property: PropertyAssignment): string {
  return `${property.name.text}: ${emitExpression(property.initializer)}`
}

// 関数の引数を文字列に変換する関数
function emitParameter(parameter: Parameter): string {
  if (parameter.typename) {
    return `${parameter.name.text}: ${emitType(parameter.typename)}`
  }
  return parameter.name.text
}
