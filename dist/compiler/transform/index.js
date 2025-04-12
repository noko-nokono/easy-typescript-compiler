import { SyntaxKind } from '../parser/type.js';
/**
 * [全体像]
 * 1. transform関数でプログラム全体の変換を開始する
 *
 */
export function transform(statements) {
    return typescript(statements);
}
// 引数で受け取った文（Statement）から型情報を削除し、JavaScriptの文に変換する関数
function typescript(statements) {
    return statements.flatMap(transformStatement);
    function transformStatement(statement) {
        switch (statement.kind) {
            // 式文の場合
            case SyntaxKind.ExpressionStatement:
                return [{ ...statement, expression: transformExpression(statement.expression) }];
            // 変数宣言の場合
            case SyntaxKind.Var:
                return [{ ...statement, typename: undefined, initializer: transformExpression(statement.initializer) }];
            // 型定義の場合
            case SyntaxKind.TypeAlias:
                return [];
            // return 文の場合
            case SyntaxKind.Return:
                return [{ ...statement, expression: transformExpression(statement.expression) }];
        }
    }
    // 式 (Expression) の種類に応じて、型情報を削除し、JavaScriptの式に変換する関数
    function transformExpression(expr) {
        switch (expr.kind) {
            // 識別子の場合
            case SyntaxKind.Identifier:
            // 数値リテラルの場合
            case SyntaxKind.NumericLiteral:
            // 文字列リテラルの場合
            case SyntaxKind.StringLiteral:
                return expr;
            // オブジェクトの場合
            case SyntaxKind.Object:
                return { ...expr, properties: expr.properties.map(transformProperty) };
            // 関数の場合
            case SyntaxKind.Function:
                return { ...expr, parameters: expr.parameters.map(transformParameter), typename: undefined, body: expr.body.flatMap(transformStatement) };
            // 代入の場合
            case SyntaxKind.Assignment:
                return { ...expr, value: transformExpression(expr.value) };
            // 関数呼び出しの場合
            case SyntaxKind.Call:
                return { ...expr, expression: transformExpression(expr.expression), arguments: expr.arguments.map(transformExpression) };
        }
    }
    // オブジェクトのプロパティを変換する関数
    function transformProperty(property) {
        return { ...property, initializer: transformExpression(property.initializer) };
    }
    // 関数の引数を変換する関数
    function transformParameter(parameter) {
        return { ...parameter, typename: undefined };
    }
}
//# sourceMappingURL=index.js.map