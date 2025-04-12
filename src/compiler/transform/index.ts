import { Statement, Expression, SyntaxKind, PropertyAssignment, Parameter } from '../parser/type.js'

/**
 * [全体像]
 * 1. transform 関数で JavaScript 相当の文へ変換する処理を開始する
 * 2. モジュール内の各文に対して transformStatement を呼び出し、構文の種類に応じて不要な型情報（typename）を除去した上で文を変換する
 * 3. 各文に含まれる式（Expression）は transformExpression によって再帰的に処理され、内部の型情報や型注釈も削除される
 * 4. 関数の引数やオブジェクトのプロパティなどの入れ子になった要素も、transformParameter や transformProperty を通じて順次変換される
 * 5. 型定義文（TypeAlias）は出力対象に含めず、JavaScript に不要な型の構造をすべて除去することで、純粋な JavaScript の構文木を生成する
 */
export function transform(statements: Statement[]) {
  return typescript(statements)
}

// 引数で受け取った文（Statement）から型情報を削除し、JavaScriptの文に変換する関数
function typescript(statements: Statement[]) {
  return statements.flatMap(transformStatement)

  function transformStatement(statement: Statement): Statement[] {
    switch (statement.kind) {
      // 式文の場合
      case SyntaxKind.ExpressionStatement:
        return [{ ...statement, expression: transformExpression(statement.expression) }]
      // 変数宣言の場合
      case SyntaxKind.Var:
        return [{ ...statement, typename: undefined, initializer: transformExpression(statement.initializer) }]
      // 型定義の場合
      case SyntaxKind.TypeAlias:
        return []
      // return 文の場合
      case SyntaxKind.Return:
        return [{ ...statement, expression: transformExpression(statement.expression) }]
    }
  }

  // 式 (Expression) の種類に応じて、型情報を削除し、JavaScriptの式に変換する関数
  function transformExpression(expr: Expression): Expression {
    switch (expr.kind) {
      // 識別子の場合
      case SyntaxKind.Identifier:
      // 数値リテラルの場合
      case SyntaxKind.NumericLiteral:
      // 文字列リテラルの場合
      case SyntaxKind.StringLiteral:
        return expr
      // オブジェクトの場合
      case SyntaxKind.Object:
        return { ...expr, properties: expr.properties.map(transformProperty) }
      // 関数の場合
      case SyntaxKind.Function:
        return { ...expr, parameters: expr.parameters.map(transformParameter), typename: undefined, body: expr.body.flatMap(transformStatement) }
      // 代入の場合
      case SyntaxKind.Assignment:
        return { ...expr, value: transformExpression(expr.value) }
      // 関数呼び出しの場合
      case SyntaxKind.Call:
        return { ...expr, expression: transformExpression(expr.expression), arguments: expr.arguments.map(transformExpression) }
    }
  }
  
  // オブジェクトのプロパティを変換する関数
  function transformProperty(property: PropertyAssignment): PropertyAssignment {
    return { ...property, initializer: transformExpression(property.initializer) }
  }
  
  // 関数の引数を変換する関数
  function transformParameter(parameter: Parameter): Parameter {
    return { ...parameter, typename: undefined }
  }
}
