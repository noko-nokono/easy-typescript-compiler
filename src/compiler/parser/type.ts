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
  body: Statement[] // TODO: Maybe needs to be Block
  locals: Table
}

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
// 関数の実行などを表す型（例: foo()）
export type ExpressionStatement = Location & {
  kind: SyntaxKind.ExpressionStatement
  expression: Expression
}
//  return 文を表す型（例: return x）
export type Return = Location & {
  kind: SyntaxKind.Return
  expression: Expression
}

// オブジェクトの型定義を表す型（例: { a: number, b: string }）
export type ObjectLiteralType = Location & DeclarationBase & {
  kind: SyntaxKind.ObjectLiteralType
  properties: PropertyDeclaration[]
  symbol: ObjectSymbol
}
// 関数の型定義を表す型（例: (x: number) => string）
export type SignatureDeclaration = Location & DeclarationBase & {
  kind: SyntaxKind.Signature
  typeParameters?: TypeParameter[]
  parameters: Parameter[]
  typename: TypeNode
  locals: Table
}
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

// オブジェクトのプロパティ代入を表す型（例: { name: "John" }）
export type PropertyAssignment = Location & DeclarationBase & {
  kind: SyntaxKind.PropertyAssignment
  name: Identifier
  initializer: Expression
}
// オブジェクトのプロパティを表す型
export type PropertyDeclaration = Location & DeclarationBase & {
  kind: SyntaxKind.PropertyDeclaration
  name: Identifier
  typename?: TypeNode
}
export type Call = Location & {
  kind: SyntaxKind.Call
  expression: Expression
  typeArguments?: TypeNode[]
  arguments: Expression[]
}

export type Symbol = {
  valueDeclaration: Declaration | undefined
  declarations: Declaration[]
  valueType?: Type
  typeType?: Type
}
// TODO: SymbolFlags to distinguish Object and Instantiated symbols
export type ObjectSymbol = Symbol & {
  members: Table
}
export type InstantiatedSymbol = Symbol & {
  target: Symbol
  mapper: Mapper
}
export enum Meaning {
  Value,
  Type,
}
export type Table = Map<string, Symbol>
export type Module = Location & {
  kind: SyntaxKind.Module
  locals: Table
  statements: Statement[]
}
export type SimpleType = { id: number }
export type PrimitiveType = SimpleType & {
  kind: Kind.Primitive
}
export enum Kind {
  Primitive,
  Object,
  Function,
  TypeVariable,
}
// TODO: Having separate Object/Function types is way easier, but it's NOT like TS does it, because JS allows properties and signatures on the same objects.
export type ObjectType = SimpleType & {
  kind: Kind.Object
  members: Table
}
export type FunctionType = SimpleType & {
  kind: Kind.Function
  signature: Signature
}
export type TypeVariable = SimpleType & {
  name: string // it's nominal babyyyyyyyyyyy (TODO: Not needed in Typescript because types optionally have a symbol)
  kind: Kind.TypeVariable
}
export type Signature = {
  typeParameters?: Symbol[]
  target?: Signature
  mapper?: Mapper
  // TODO: Maybe need instantiations?: Map<string, Signature> too? It's technically caching I think, and I'm not doing that yet
  parameters: Symbol[]
  returnType: Type
}
export type Type = PrimitiveType | ObjectType | FunctionType | TypeVariable
export type Mapper = { sources: TypeVariable[], targets: Type[] }
