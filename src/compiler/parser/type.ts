export enum SyntaxKind {
  Module,                // モジュール
  Identifier,            // 識別子
  NumericLiteral,        // 数値
  StringLiteral,         // 文字列
  Assignment,            // 代入
  ExpressionStatement,   // 式文
  Var,                   // 変数
  TypeAlias,             // 型エイリアス
  Object,                // オブジェクト
  PropertyAssignment,    // プロパティ代入
  ObjectLiteralType,     // オブジェクトリテラル型
  PropertyDeclaration,   // プロパティ宣言
  Function,              // 関数
  Signature,             // シグネチャ
  Parameter,             // 引数（パラメータ）
  TypeParameter,         // 型パラメータ
  Return,                // 戻り値
  Call,                  // 関数呼び出し
}

// エラーが発生した際に返す値の型
export type Error = {
  pos: number
  message: string
}
// 解析している値・要素の位置情報の型
export interface Location {
  parent: Node // 値・要素の親要素を表す
  pos: number  // 値・要素がソースコード内のどの位置にあるかを示す
}

// コードの式を表す型
// プログラム内での演算や参照などを行う要素の型
export type Expression = Identifier | NumericLiteral | StringLiteral | Assignment | Object | Function | Call
// コードの文を表す型
// プログラムの実行単位（アクションや宣言）を表す要素の型
export type Statement = Var | TypeAlias | ExpressionStatement | Return
// 型情報を表す値・要素の集合を表す型
export type TypeNode = ObjectLiteralType | Identifier | SignatureDeclaration
// プログラムでの宣言を表す型
export type Declaration = Var | TypeAlias | ObjectLiteralType | Object | Parameter | TypeParameter | PropertyAssignment | PropertyDeclaration | Function | SignatureDeclaration
export type DeclarationBase = {
  symbol: Symbol
}
export type Container = Module | Function
export type Node = Expression | Statement | Declaration | Module | TypeNode

// ------------------------------------------------------------
// 以下、コードの要素を表す型

// 変数名や関数名などの識別子を表す型
export type Identifier = Location & {
  kind: SyntaxKind.Identifier
  text: string
}
// 数値を表す型
export type NumericLiteral = Location & {
  kind: SyntaxKind.NumericLiteral
  value: number
}
// 文字列を表す型
export type StringLiteral = Location & {
  kind: SyntaxKind.StringLiteral
  value: string
}
// 代入式を表す型（例: x = 10）
export type Assignment = Location & {
  kind: SyntaxKind.Assignment
  name: Identifier
  value: Expression
}
// オブジェクトを表す型（例: { a: 1, b: 2 }）
export type Object = Location & DeclarationBase & {
  kind: SyntaxKind.Object
  properties: PropertyAssignment[]
  symbol: ObjectSymbol
}
// 関数を表す型（例: function() {}）
export type Function = Location & DeclarationBase & {
  kind: SyntaxKind.Function
  name?: Identifier
  typeParameters?: TypeParameter[]
  parameters: Parameter[]
  typename?: TypeNode
  body: Statement[]
  locals: Table
}

// ------------------------------------------------------------
// 以下、宣言を表す型

// 変数宣言を表す型（例: var x = 10）
export type Var = Location & DeclarationBase & {
  kind: SyntaxKind.Var
  name: Identifier
  typename?: TypeNode
  initializer: Expression
}
// 型エイリアス宣言を表す型（例: type MyType = { a: number, b: string }）
export type TypeAlias = Location & DeclarationBase & {
  kind: SyntaxKind.TypeAlias
  name: Identifier
  typename: TypeNode
}
// 式を実行する文（例: console.log("Hello")）
export type ExpressionStatement = Location & {
  kind: SyntaxKind.ExpressionStatement
  expression: Expression
}
//  return 文を表す型（例: return x）
export type Return = Location & {
  kind: SyntaxKind.Return
  expression: Expression
}

// ------------------------------------------------------------
// 以下、型定義を表す型

// オブジェクトの型定義を表す型（例: type hoge = { a: number, b: string }）
export type ObjectLiteralType = Location & DeclarationBase & {
  kind: SyntaxKind.ObjectLiteralType
  properties: PropertyDeclaration[]
  symbol: ObjectSymbol
}
// オブジェクトのプロパティ代入を表す型（例: { name: "John" }）
export type PropertyAssignment = Location & DeclarationBase & {
  kind: SyntaxKind.PropertyAssignment
  name: Identifier
  initializer: Expression
}
// オブジェクトのプロパティを表す型（例: name: string）
export type PropertyDeclaration = Location & DeclarationBase & {
  kind: SyntaxKind.PropertyDeclaration
  name: Identifier
  typename?: TypeNode
}
// 関数の型定義を表す型（例: (x: number) => string）
export type SignatureDeclaration = Location & DeclarationBase & {
  kind: SyntaxKind.Signature
  typeParameters?: TypeParameter[]
  parameters: Parameter[]
  typename: TypeNode
  locals: Table
}

// ------------------------------------------------------------
// 以下、関数の引数や戻り値を表す型

// 関数の引数の型を表す型（例: (a: number)）
export type Parameter = Location & DeclarationBase & {
  kind: SyntaxKind.Parameter
  name: Identifier
  typename?: TypeNode
}
// ジェネリック型の引数を表す型(例: <T>）
export type TypeParameter = Location & DeclarationBase & {
  kind: SyntaxKind.TypeParameter
  name: Identifier
}

// 関数の実行を表す型（例: foo()）
export type Call = Location & {
  kind: SyntaxKind.Call
  expression: Expression
  typeArguments?: TypeNode[]
  arguments: Expression[]
}

// 関数の型を表し、関数シグネチャを持っています
export type FunctionType = SimpleType & {
  kind: Kind.Function
  signature: Signature
}

// 関数シグネチャを表し、型パラメータや戻り値、引数情報を保持します
export type Signature = {
  typeParameters?: Symbol[]
  target?: Signature
  mapper?: Mapper
  parameters: Symbol[]
  returnType: Type
}

// ------------------------------------------------------------

// 識別子の情報を管理する型
export type Symbol = {
  // 変数や関数の定義元
  valueDeclaration: Declaration | undefined
  // この値が関係する宣言のリスト
  declarations: Declaration[]
  valueType?: Type
  typeType?: Type
}
// Symbol型のオブジェクトを表す型
export type ObjectSymbol = Symbol & {
  members: Table
}
// Symbol型のジェネリック型を具体的な型に変換したシンボル
export type InstantiatedSymbol = Symbol & {
  target: Symbol
  mapper: Mapper
}
// シンボルを管理するためのマップの型
export type Table = Map<string, Symbol>
// ファイル単位（モジュール）の情報を表す型
// parserで返されるASTのルートノード
export type Module = Location & {
  kind: SyntaxKind.Module
  locals: Table
  statements: Statement[]
}
// idで型を識別する型
export type SimpleType = { id: number }
// プリミティブ型 (string, number, boolean, undefined など) を表します。
export type PrimitiveType = SimpleType & {
  kind: Kind.Primitive
}
// 型の種類を表す型
// プリミティブ型、オブジェクト型、関数型、型変数の4つの種類がある
export enum Kind {
  Primitive,
  Object,
  Function,
  TypeVariable,
}
// オブジェクト型を表し、プロパティやメソッドを保持する
export type ObjectType = SimpleType & {
  kind: Kind.Object
  members: Table
}
// ジェネリック型などの型変数を表します
export type TypeVariable = SimpleType & {
  name: string
  kind: Kind.TypeVariable
}
// 値（変数・関数）なのか型（インターフェース・型エイリアス）なのかを区別するための列挙型
export enum Meaning {
  Value,
  Type,
}
// 型システムのコアであり、すべての型を表す型
export type Type = PrimitiveType | ObjectType | FunctionType | TypeVariable
// ジェネリック型の型引数を変換するためのマッピング型
export type Mapper = { sources: TypeVariable[], targets: Type[] }
