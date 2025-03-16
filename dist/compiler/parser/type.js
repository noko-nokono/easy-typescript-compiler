export var SyntaxKind;
(function (SyntaxKind) {
    SyntaxKind[SyntaxKind["Module"] = 0] = "Module";
    SyntaxKind[SyntaxKind["Identifier"] = 1] = "Identifier";
    SyntaxKind[SyntaxKind["NumericLiteral"] = 2] = "NumericLiteral";
    SyntaxKind[SyntaxKind["StringLiteral"] = 3] = "StringLiteral";
    SyntaxKind[SyntaxKind["Assignment"] = 4] = "Assignment";
    SyntaxKind[SyntaxKind["ExpressionStatement"] = 5] = "ExpressionStatement";
    SyntaxKind[SyntaxKind["Var"] = 6] = "Var";
    SyntaxKind[SyntaxKind["TypeAlias"] = 7] = "TypeAlias";
    SyntaxKind[SyntaxKind["Object"] = 8] = "Object";
    SyntaxKind[SyntaxKind["PropertyAssignment"] = 9] = "PropertyAssignment";
    SyntaxKind[SyntaxKind["ObjectLiteralType"] = 10] = "ObjectLiteralType";
    SyntaxKind[SyntaxKind["PropertyDeclaration"] = 11] = "PropertyDeclaration";
    SyntaxKind[SyntaxKind["Function"] = 12] = "Function";
    SyntaxKind[SyntaxKind["Signature"] = 13] = "Signature";
    SyntaxKind[SyntaxKind["Parameter"] = 14] = "Parameter";
    SyntaxKind[SyntaxKind["TypeParameter"] = 15] = "TypeParameter";
    SyntaxKind[SyntaxKind["Return"] = 16] = "Return";
    SyntaxKind[SyntaxKind["Call"] = 17] = "Call";
})(SyntaxKind || (SyntaxKind = {}));
// 型の種類を表す型
// プリミティブ型、オブジェクト型、関数型、型変数の4つの種類がある
export var Kind;
(function (Kind) {
    Kind[Kind["Primitive"] = 0] = "Primitive";
    Kind[Kind["Object"] = 1] = "Object";
    Kind[Kind["Function"] = 2] = "Function";
    Kind[Kind["TypeVariable"] = 3] = "TypeVariable";
})(Kind || (Kind = {}));
// 値（変数・関数）なのか型（インターフェース・型エイリアス）なのかを区別するための列挙型
export var Meaning;
(function (Meaning) {
    Meaning[Meaning["Value"] = 0] = "Value";
    Meaning[Meaning["Type"] = 1] = "Type";
})(Meaning || (Meaning = {}));
//# sourceMappingURL=type.js.map