import { SyntaxKind, Meaning } from '../parser/type.js';
import { error } from '../error.js';
// 宣言に関する値を管理する値
export const valueDeclarations = new Set([SyntaxKind.Var, SyntaxKind.Object, SyntaxKind.PropertyAssignment, SyntaxKind.PropertyDeclaration, SyntaxKind.Parameter]);
// 型エイリアスの宣言を管理する値
export const typeDeclarations = new Set([SyntaxKind.TypeAlias]);
/**
 * [全体像]
 * 1. bind関数でプログラム全体の解析を開始する
 * 2. bindStatementでプログラムの各文を解析する（var, type, return, expression（式））
 *    - var: 変数宣言の解析
 *    - type: 型定義の解析
 *    - return: return文の解析
 *    - expression: 式文の解析
 * 3. bindExpressionでプログラムの各式を解析する（object, function, assignment, call, identifier, string, number）
 *    - object: オブジェクトの解析
 *    - function: 関数の解析
 *    - assignment: 代入の解析
 *    - call: 関数呼び出しの解析
 *    - identifier: 識別子の解析
 *    - string: 文字列の解析
 *    - number: 数値の解析
 */
export function binder(m) {
    setParents(m, m.statements);
    for (const statement of m.statements) {
        bindStatement(m.locals, statement);
    }
    // 文（Statement）の種類に応じて、親子関係の設定やシンボルの登録、再帰的な解析を行う関数
    function bindStatement(locals, statement) {
        switch (statement.kind) {
            // 変数宣言の場合
            case SyntaxKind.Var:
                setParents(statement, [statement.name, statement.typename, statement.initializer]);
                bindExpression(statement.initializer);
                bindType(statement.typename);
                declareSymbol(locals, statement, Meaning.Value);
                break;
            // 型定義の場合
            case SyntaxKind.TypeAlias:
                setParents(statement, [statement.name, statement.typename]);
                bindType(statement.typename);
                declareSymbol(locals, statement, Meaning.Type);
                break;
            // 式文の場合
            case SyntaxKind.ExpressionStatement:
            // return 文の場合
            case SyntaxKind.Return:
                setParents(statement, [statement.expression]);
                bindExpression(statement.expression);
                break;
            default:
                throw new Error(`Unexpected statement kind ${SyntaxKind[statement.kind]}`);
        }
    }
    // 式 (Expression) の種類に応じて、親子関係の設定やシンボルの登録、再帰的な解析を行う関数
    function bindExpression(expr) {
        switch (expr.kind) {
            // オブジェクトの場合
            case SyntaxKind.Object:
                setParents(expr, expr.properties);
                for (const property of expr.properties) {
                    setParents(property, [property.name, property.initializer]);
                    bindExpression(property.initializer);
                    declareSymbol(expr.symbol.members, property, Meaning.Value);
                }
                break;
            // 関数の場合
            case SyntaxKind.Function:
                setParents(expr, [expr.name, ...expr.typeParameters ?? [], ...expr.parameters, expr.typename, ...expr.body]);
                bindType(expr.typename);
                for (const typeParameter of expr.typeParameters ?? []) {
                    setParents(typeParameter, [typeParameter.name]);
                    declareSymbol(expr.locals, typeParameter, Meaning.Type);
                }
                for (const parameter of expr.parameters) {
                    setParents(parameter, [parameter.name, parameter.typename]);
                    bindType(parameter.typename);
                    declareSymbol(expr.locals, parameter, Meaning.Value);
                }
                for (const statement of expr.body) {
                    bindStatement(expr.locals, statement);
                }
                break;
            // 代入の場合
            case SyntaxKind.Assignment:
                setParents(expr, [expr.name, expr.value]);
                bindExpression(expr.value);
                break;
            // 関数呼び出しの場合
            case SyntaxKind.Call:
                setParents(expr, [expr.expression, ...(expr.typeArguments ?? []), ...expr.arguments]);
                bindExpression(expr.expression);
                for (const typeArgument of expr.typeArguments ?? []) {
                    bindType(typeArgument);
                }
                for (const arg of expr.arguments) {
                    bindExpression(arg);
                }
                break;
            // 識別子・文字列・数値の場合
            case SyntaxKind.Identifier:
            case SyntaxKind.StringLiteral:
            case SyntaxKind.NumericLiteral:
                break;
            default:
                throw new Error(`Unexpected expression kind ${SyntaxKind[expr.kind]}`);
        }
    }
    // 型情報を解析し、シンボルテーブルに型や値の情報を関連付ける役割
    function bindType(type) {
        // どのような型情報かを判別する
        switch (type?.kind) {
            // オブジェクトの型定義の場合
            case SyntaxKind.ObjectLiteralType:
                setParents(type, type.properties);
                for (const property of type.properties) {
                    setParents(property, [property.name, property.typename]);
                    bindType(property.typename);
                    declareSymbol(type.symbol.members, property, Meaning.Value);
                }
                break;
            // 関数の型定義の場合
            case SyntaxKind.Signature:
                setParents(type, [...type.typeParameters ?? [], ...type.parameters, type.typename]);
                for (const typeParameter of type.typeParameters ?? []) {
                    setParents(typeParameter, [typeParameter.name]);
                    declareSymbol(type.locals, typeParameter, Meaning.Type);
                }
                for (const parameter of type.parameters) {
                    setParents(parameter, [parameter.name, parameter.typename]);
                    bindType(parameter.typename);
                    declareSymbol(type.locals, parameter, Meaning.Value);
                }
                break;
            // 型名などを指している場合
            case SyntaxKind.Identifier:
                break;
        }
    }
    // 引数のcontainerに、宣言された変数や型の情報を追加する
    // 同じ名前で複数回宣言されていないかや、型と値の両立を許可するかなどのチェックも行います
    // container: 変数名や型名に対応するSymbolを管理するマップ
    // declaration: 宣言された変数や型の情報
    // meaning: 宣言された変数や型が値なのか型なのかを示す
    function declareSymbol(container, declaration, meaning) {
        const name = getDeclarationName(declaration);
        // すでに同じ名前の宣言があるかどうかを取得する
        let symbol = container.get(name);
        if (symbol) {
            // すでに存在するシンボルに対して、同じ意味の宣言があるか探す
            const other = symbol.declarations.find(d => meaning === getMeaning(d));
            if (other) {
                error(declaration.pos, `Cannot redeclare ${name}; first declared at ${other.pos}`);
            }
            else {
                symbol.declarations.push(declaration);
                if (!symbol.valueDeclaration && meaning === Meaning.Value) {
                    symbol.valueDeclaration = declaration;
                }
            }
        }
        // 同じ名前の宣言がない場合は、新しい宣言を追加する
        else {
            symbol = {
                declarations: [declaration],
                valueDeclaration: meaning == Meaning.Value ? declaration : undefined,
            };
            container.set(name, symbol);
        }
        declaration.symbol = symbol;
    }
}
// AST（抽象構文木）の親子関係を設定する
function setParents(parent, children) {
    for (const child of children) {
        if (child)
            child.parent = parent;
    }
}
// AST（抽象構文木）の宣言が値なのか型なのかを判別する
export function getMeaning(declaration) {
    return valueDeclarations.has(declaration.kind) ? Meaning.Value : Meaning.Type;
}
// AST（抽象構文木）の宣言名を取得する
// （例）const x = 10; から x を取得する
export function getDeclarationName(node) {
    switch (node.kind) {
        case SyntaxKind.Var:
        case SyntaxKind.TypeAlias:
        case SyntaxKind.PropertyAssignment:
        case SyntaxKind.PropertyDeclaration:
        case SyntaxKind.Parameter:
        case SyntaxKind.TypeParameter:
            return node.name.text;
        case SyntaxKind.Object:
            return "__object";
        default:
            error(node.pos, `Cannot get name of ${SyntaxKind[node.kind]}`);
            return "__missing";
    }
}
//# sourceMappingURL=index.js.map