import { SyntaxKind, Meaning, Kind } from '../parser/type.js';
import { error } from '../error.js';
import { getMeaning } from '../binder/index.js';
let typeCount = 0;
// 文字列型
const stringType = { kind: Kind.Primitive, id: typeCount++ };
// 数値型
const numberType = { kind: Kind.Primitive, id: typeCount++ };
// エラー型
const errorType = { kind: Kind.Primitive, id: typeCount++ };
// any型
const anyType = { kind: Kind.Primitive, id: typeCount++ };
/**
 * [全体像]
 * 1.
 * [ポイント]
 * check〇〇関数は、型のチェックを行う関数で、infer〇〇関数は、型の推論を行う関数
 */
export function checker(module) {
    return module.statements.map(checkStatement);
    // コードの文の型チェックを行う
    // プログラムの実行単位（アクションや宣言）を表す要素を引数に受け取り、型のチェックを行う関数
    function checkStatement(statement) {
        switch (statement.kind) {
            // 式文の場合
            case SyntaxKind.ExpressionStatement:
                return checkExpression(statement.expression);
            // 変数宣言の場合
            case SyntaxKind.Var:
                const i = checkExpression(statement.initializer);
                if (!statement.typename) {
                    return i;
                }
                const t = checkType(statement.typename);
                if (!isAssignableTo(i, t))
                    error(statement.initializer, `Cannot assign initialiser of type '${typeToString(i)}' to variable with declared type '${typeToString(t)}'.`);
                return t;
            // 型エイリアスの場合
            case SyntaxKind.TypeAlias:
                return checkType(statement.typename);
            // return文の場合
            case SyntaxKind.Return:
                return checkExpression(statement.expression);
        }
    }
    // コードの式の型チェックを行う
    // プログラム内での演算や参照などを行う要素を引数に受け取り、型のチェックを行う関数
    function checkExpression(expression) {
        switch (expression.kind) {
            // 識別子の場合
            case SyntaxKind.Identifier:
                const symbol = resolve(expression, expression.text, Meaning.Value);
                if (symbol) {
                    return getValueTypeOfSymbol(symbol);
                }
                error(expression, "Could not resolve " + expression.text);
                return errorType;
            // 数値の場合
            case SyntaxKind.NumericLiteral:
                return numberType;
            // 文字列の場合
            case SyntaxKind.StringLiteral:
                return stringType;
            // オブジェクトの場合
            case SyntaxKind.Object:
                return checkObject(expression);
            // 代入の場合
            case SyntaxKind.Assignment:
                const v = checkExpression(expression.value);
                const t = checkExpression(expression.name);
                if (!isAssignableTo(v, t))
                    error(expression.name, `Cannot assign value of type '${typeToString(v)}' to variable of type '${typeToString(t)}'.`);
                return t;
            // 関数の場合
            case SyntaxKind.Function:
                return checkFunction(expression);
            // 関数呼び出しの場合
            case SyntaxKind.Call:
                return checkCall(expression);
        }
    }
    // オブジェクトの型チェックを行う関数
    function checkObject(object) {
        const members = new Map();
        for (const p of object.properties) {
            const symbol = resolve(p, p.name.text, Meaning.Value);
            if (!symbol) {
                throw new Error(`Binder did not correctly bind property ${p.name.text} of object with keys ${Object.keys(object.symbol.members)}`);
            }
            members.set(p.name.text, symbol);
            checkProperty(p);
        }
        return { kind: Kind.Object, id: typeCount++, members };
    }
    // オブジェクトのプロパティの値（initializer）を型チェックを行う関数
    function checkProperty(property) {
        return checkExpression(property.initializer);
    }
    // 関数の型チェックを行う関数
    function checkFunction(func) {
        return getValueTypeOfSymbol(func.symbol);
    }
    // 関数呼び出しの型チェックを行う関数
    function checkCall(call) {
        // 呼び出しを行なった関数自体の型を取得
        const expressionType = checkExpression(call.expression);
        // 呼び出しを行なった関数の型が関数でない場合はエラー
        if (expressionType.kind !== Kind.Function) {
            error(call.expression, `Cannot call expression of type '${typeToString(expressionType)}'.`);
            return errorType;
        }
        // 呼び出しを行なった関数の引数の型を取得
        const argTypes = call.arguments.map(checkExpression);
        // ジェネリック関数の場合は、型引数を取得
        let sig = expressionType.signature;
        // 以下ジェネリック関数の場合のif文
        if (sig.typeParameters) {
            let typeArguments;
            const typeParameters = sig.typeParameters.map(getTypeTypeOfSymbol);
            // 関数の引数の型が指定されていない場合は、引数の型を推論
            if (!call.typeArguments) {
                typeArguments = inferTypeArguments(typeParameters, sig, argTypes);
            }
            // 型引数の数が合わない場合はエラー
            else if (sig.typeParameters.length !== call.typeArguments.length) {
                error(call.expression, `Expected ${sig.typeParameters.length} type arguments, but got ${call.typeArguments.length}.`);
                typeArguments = sig.typeParameters.map(_ => anyType);
            }
            // 型の定義があれば、その型の解析を行う
            else {
                typeArguments = call.typeArguments.map(checkType);
            }
            // ジェネリック型を具体的な型に置き換える
            sig = instantiateSignature(sig, { sources: typeParameters, targets: typeArguments });
        }
        // 関数の期待する引数と、渡された引数の数を比較し、一致しなければエラー
        if (sig.parameters.length !== call.arguments.length) {
            error(call.expression, `Expected ${sig.parameters.length} arguments, but got ${call.arguments.length}.`);
        }
        // 各引数の型が、関数呼び出しの引数の型と一致するかチェック
        for (let i = 0; i < Math.min(argTypes.length, sig.parameters.length); i++) {
            const parameterType = getValueTypeOfSymbol(sig.parameters[i]);
            if (!isAssignableTo(argTypes[i], parameterType)) {
                error(call.arguments[i], `Expected argument of type '${typeToString(parameterType)}', but got '${typeToString(argTypes[i])}'.`);
            }
        }
        // 関数の返り値の型
        return sig.returnType;
    }
    // ジェネリック関数の型を具体的な型（（例）T -> number)に置き換えるラッパー関数
    function instantiateSignature(signature, mapper) {
        return {
            typeParameters: undefined,
            parameters: signature.parameters.map(p => instantiateSymbol(p, mapper)),
            returnType: instantiateType(signature.returnType, mapper),
            target: signature,
            mapper,
        };
    }
    // ジェネリック関数の型を具体的な型（（例）T -> number)に置き換える関数
    function instantiateType(type, mapper) {
        switch (type.kind) {
            // プリミティブ型（string, number...）の場合
            case Kind.Primitive:
                return type;
            // 関数型の場合
            case Kind.Function:
                return { kind: Kind.Function, id: typeCount++, signature: instantiateSignature(type.signature, mapper) };
            // オブジェクト型の場合
            case Kind.Object:
                const members = new Map();
                for (const [m, s] of type.members) {
                    members.set(m, instantiateSymbol(s, mapper));
                }
                return { kind: Kind.Object, id: typeCount++, members };
            // 型変数の場合
            case Kind.TypeVariable:
                for (let i = 0; i < mapper.sources.length; i++) {
                    if (mapper.sources[i] === type) {
                        return mapper.targets[i];
                    }
                }
                return type;
            default:
                throw new Error("Unexpected type kind " + Kind[type.kind]);
        }
    }
    // Symbol型のジェネリック型を具体的な型に変換する関数
    function instantiateSymbol(symbol, mapper) {
        return {
            declarations: symbol.declarations,
            valueDeclaration: symbol.valueDeclaration,
            target: symbol,
            mapper,
            valueType: symbol.valueType && instantiateType(symbol.valueType, mapper),
            typeType: symbol.typeType && instantiateType(symbol.typeType, mapper),
        };
    }
    // 関数のジェネリクス型の型引数を推論する
    function inferTypeArguments(typeParameters, signature, argTypes) {
        // ジェネリック型パラメータ（typeParameters）ごとに型推論の候補リスト（inferences）を作成
        const inferences = new Map();
        for (const typeParameter of typeParameters) {
            inferences.set(typeParameter, []);
        }
        let i = 0;
        for (const parameter of signature.parameters) {
            // 関数の引数と宣言されたパラメータを比較し、型推論を実行
            inferType(argTypes[i], getValueTypeOfSymbol(parameter));
            i++;
        }
        // 最初に推論された型を各型パラメータに適用して返す
        return typeParameters.map(p => inferences.get(p)[0]);
        // 引数で受け取った型の情報を元に、型推論を行う関数
        // 第二引数の型が、第一引数の型に代入可能かどうかを判別する
        // 第一引数の型が、第二引数の型に代入可能な場合は、第一引数の型を第二引数の型に推論する
        function inferType(source, target) {
            switch (target.kind) {
                // プリミティブ型（string, number...）の場合
                case Kind.Primitive:
                    return;
                // 関数型の場合
                case Kind.Function:
                    if (source.kind === Kind.Function) {
                        const sourceSig = source.signature;
                        const targetSig = target.signature;
                        if (sourceSig.typeParameters && targetSig.typeParameters) {
                            inferFromSymbols(sourceSig.typeParameters, targetSig.typeParameters);
                        }
                        inferFromSymbols(sourceSig.parameters, targetSig.parameters);
                        inferType(sourceSig.returnType, targetSig.returnType);
                    }
                    return;
                // オブジェクト型の場合
                case Kind.Object:
                    return;
                // 型変数の場合
                case Kind.TypeVariable:
                    inferences.get(target).push(source);
                    return;
            }
        }
        // 複数シンボルの型を比較し、型推論を行う関数
        function inferFromSymbols(sources, targets) {
            for (let i = 0; i < Math.min(sources.length, targets.length); i++) {
                if (targets[i])
                    inferType(getValueTypeOfSymbol(sources[i]), getValueTypeOfSymbol(targets[i]));
            }
        }
    }
    // 関数の引数の型チェックを行う関数
    function checkParameter(parameter) {
        return parameter.typename ? checkType(parameter.typename) : anyType;
    }
    // 関数の引数（ジェネリクス）の型チェックを行う関数
    function checkTypeParameter(typeParameter) {
        return getTypeTypeOfSymbol(typeParameter.symbol);
    }
    // 関数本体（ブロック）内の解析を行い、その関数の戻り値の型を返す関数
    function checkBody(body, declaredType) {
        // 関数本体の文を順番に処理
        for (const statement of body) {
            checkStatement(statement);
        }
        // 全てのreturn文を取得し、戻り値の型を取得
        const types = [];
        forEachReturnStatement(body, returnStatement => {
            const returnType = checkStatement(returnStatement);
            if (declaredType && returnType !== declaredType) {
                if (!isAssignableTo(returnType, declaredType))
                    error(returnStatement, `Returned type '${typeToString(returnType)}' does not match declared return type '${typeToString(declaredType)}'.`);
            }
            types.push(returnType);
        });
        return types[0];
    }
    // 関数内にあるreturn文を全て取得する関数
    // 引数で受け取った関数の本体（body）を順番に処理し、return文を見つけたらコールバック関数を実行する
    function forEachReturnStatement(body, callback) {
        for (const statement of body) {
            traverse(statement);
        }
        function traverse(node) {
            switch (node.kind) {
                case SyntaxKind.ExpressionStatement:
                case SyntaxKind.Var:
                case SyntaxKind.TypeAlias:
                    return;
                case SyntaxKind.Return:
                    return callback(node);
                default:
                    const unused = node;
                    console.log(`${unused} should *never* have been used`);
            }
        }
    }
    // TypeNode（構文上の型表現）を受け取り、それが意味する実際の型（Type）を返す関数。
    // ソースコード上に書かれた型注釈や型定義を、型システム内部で使うTypeオブジェクトに変換する。
    // 例： "string" という型注釈があったら、それに対応する stringType を返す。
    // { name: string, age: number } のような型定義なら、オブジェクト型を構築して返す。
    // 型の検証を行うわけではない
    function checkType(type) {
        switch (type.kind) {
            // 識別子の場合
            case SyntaxKind.Identifier:
                switch (type.text) {
                    case "string":
                        return stringType;
                    case "number":
                        return numberType;
                    default:
                        const symbol = resolve(type, type.text, Meaning.Type);
                        if (symbol) {
                            return getTypeTypeOfSymbol(symbol);
                        }
                        error(type, "Could not resolve type " + type.text);
                        return errorType;
                }
            // オブジェクトの場合
            case SyntaxKind.ObjectLiteralType:
                return checkObjectLiteralType(type);
            // 関数の場合
            case SyntaxKind.Signature:
                return getTypeTypeOfSymbol(type.symbol);
        }
    }
    // オブジェクトリテラルの型チェックを行う関数
    function checkObjectLiteralType(object) {
        const members = new Map();
        // オブジェクトリテラルのプロパティを順番に処理
        for (const p of object.properties) {
            const symbol = resolve(p, p.name.text, Meaning.Value);
            if (!symbol) {
                throw new Error(`Binder did not correctly bind property ${p.name.text} of object literal type with keys ${Object.keys(object.symbol.members)}`);
            }
            members.set(p.name.text, symbol);
            checkPropertyDeclaration(p);
        }
        return object.symbol.typeType = { kind: Kind.Object, id: typeCount++, members };
    }
    // オブジェクトのプロパティの型チェックを行う関数
    function checkPropertyDeclaration(property) {
        if (property.typename) {
            return checkType(property.typename);
        }
        return anyType;
    }
    // 引数で受け取ったシンボルの値の型を取得する関数
    function getValueTypeOfSymbol(symbol) {
        // シンボルが値を持っているかどうかを確認
        if (!symbol.valueDeclaration) {
            throw new Error("Cannot get value type of symbol without value declaration");
        }
        // すでに型が決まっている場合はその値をそのまま返す
        if (symbol.valueType)
            return symbol.valueType;
        // シンボルが型エイリアスの場合は、エイリアスの型を取得
        if ('target' in symbol) {
            const alias = symbol;
            return instantiateType(getValueTypeOfSymbol(alias.target), alias.mapper);
        }
        // シンボルの値の型を取得
        switch (symbol.valueDeclaration.kind) {
            case SyntaxKind.Var:
            case SyntaxKind.TypeAlias:
                return checkStatement(symbol.valueDeclaration);
            case SyntaxKind.Object:
                return checkExpression(symbol.valueDeclaration);
            case SyntaxKind.PropertyAssignment:
                return checkProperty(symbol.valueDeclaration);
            case SyntaxKind.PropertyDeclaration:
                return symbol.valueDeclaration.typename ? checkType(symbol.valueDeclaration.typename) : anyType;
            case SyntaxKind.Parameter:
                return checkParameter(symbol.valueDeclaration);
            case SyntaxKind.Function:
                return getTypeOfFunction(symbol.valueDeclaration);
            default:
                throw new Error("Unxpected value declaration kind " + SyntaxKind[symbol.valueDeclaration.kind]);
        }
    }
    // 関数を解析して、その関数の型を取得する関数
    function getTypeOfFunction(func) {
        for (const typeParameter of func.typeParameters || []) {
            // 関数の引数（ジェネリクス型）の型チェック
            checkTypeParameter(typeParameter);
        }
        for (const parameter of func.parameters) {
            // 関数の引数の型チェック
            checkParameter(parameter);
        }
        // 関数の戻り値の型を取得
        const declaredType = func.typename && checkType(func.typename);
        // 関数の本体の型チェック
        const bodyType = checkBody(func.body, declaredType);
        const signature = {
            typeParameters: func.typeParameters?.map(p => p.symbol),
            parameters: func.parameters.map(p => p.symbol),
            returnType: declaredType || bodyType,
        };
        return func.symbol.valueType = { kind: Kind.Function, id: typeCount++, signature };
    }
    // 関数の型定義を解析して、その関数の型を取得する関数
    // type Fn = (x: number) => string のような関数の定義本体を持たない型定義を解析する
    function getTypeOfSignature(decl) {
        for (const typeParameter of decl.typeParameters || []) {
            checkTypeParameter(typeParameter);
        }
        for (const parameter of decl.parameters) {
            checkParameter(parameter);
        }
        const signature = {
            typeParameters: decl.typeParameters?.map(p => p.symbol),
            parameters: decl.parameters.map(p => p.symbol),
            returnType: decl.typename && checkType(decl.typename) || anyType,
        };
        return decl.symbol.typeType = { kind: Kind.Function, id: typeCount++, signature };
    }
    // 引数で受けたシンボルの値から、そのシンボルの型情報を取得する関数
    function getTypeTypeOfSymbol(symbol) {
        // すでに型が決まっている場合はその値をそのまま返す
        if (symbol.typeType)
            return symbol.typeType;
        // シンボルが型エイリアスの場合は、エイリアスの型を取得
        if ('target' in symbol) {
            const alias = symbol;
            return instantiateType(getTypeTypeOfSymbol(alias.target), alias.mapper);
        }
        // シンボルに関連する宣言を順番に処理し、適切な型を取得 
        for (const d of symbol.declarations) {
            switch (d.kind) {
                // 型エイリアス（type X = Y）の場合
                case SyntaxKind.TypeAlias:
                    return checkType(d.typename);
                // ジェネリック型パラメータ（T）の場合
                case SyntaxKind.TypeParameter:
                    return symbol.typeType = { id: typeCount++, kind: Kind.TypeVariable, name: d.name.text };
                // 関数のシグネチャ（(x: number) => string）の場合
                case SyntaxKind.Signature:
                    return getTypeOfSignature(d);
            }
        }
        throw new Error(`Symbol has no type declarations`);
    }
    // 型定義を文字列に変換する関数
    // 型エラーが発生した際のエラー内容を表示するために、型の情報を文字列に変換する
    function typeToString(type) {
        switch (type.kind) {
            // プリミティブ型（string, number...）の場合
            case Kind.Primitive:
                switch (type.id) {
                    case stringType.id: return 'string';
                    case numberType.id: return 'number';
                    case errorType.id: return 'error';
                    case anyType.id: return 'any';
                    default: throw new Error("Unknown primitive type with id " + type.id);
                }
            // オブジェクト型の場合
            case Kind.Object:
                const propertiesToString = ([name, symbol]) => `${name}: ${typeToString(getValueTypeOfSymbol(symbol))}`;
                return `{ ${Array.from(type.members).map(propertiesToString).join(', ')} }`;
            // 関数型の場合
            case Kind.Function:
                const parametersToString = (p) => `${p.valueDeclaration.name.text}: ${typeToString(getValueTypeOfSymbol(p))}`;
                return `(${type.signature.parameters.map(parametersToString).join(', ')}) => ${typeToString(type.signature.returnType)}`;
            // 型変数の場合
            case Kind.TypeVariable:
                return type.name;
        }
    }
    // 名前解決を行う関数
    // 引数で受け取った名前を持つシンボルを、上のスコープに向かって順番に探していく
    function resolve(location, name, meaning) {
        while (location) {
            // スコープ内に対応のシンボルテーブルがあるかどうかを確認
            const table = (location.kind === SyntaxKind.Module || location.kind === SyntaxKind.Function || location.kind === SyntaxKind.Signature) ? location.locals
                : (location.kind === SyntaxKind.Object || location.kind === SyntaxKind.ObjectLiteralType) ? location.symbol.members
                    : undefined;
            // シンボルテーブルがある場合は、名前を元にシンボルを取得
            if (table) {
                const symbol = getSymbol(table, name, meaning);
                if (symbol) {
                    return symbol;
                }
            }
            // シンボルが見つからなかった場合、親のスコープを探す
            location = location.parent;
        }
    }
    // 指定された名前と種類（値・型）に一致するシンボルを、指定されたスコープ内から探す関数
    function getSymbol(locals, name, meaning) {
        const symbol = locals.get(name);
        if (symbol?.declarations.some(d => getMeaning(d) === meaning)) {
            return symbol;
        }
    }
    // 値(第一引数のsource)が定義された型(第二引数のtarget)に代入可能かどうかを判定する関数
    // 型の互換性を確認するために、型の種類やメンバーの型を比較する
    // booleanの値を返し、代入可能でなければ呼び出し元でエラーを出力する
    function isAssignableTo(source, target) {
        // 型の種類が同じか、any型またはerror型の場合はtrueを返す
        if (source === target
            || source === anyType || target === anyType
            || source === errorType || target === errorType)
            return true;
        // プリミティブ型の場合は、型の種類が同じかどうかを比較
        else if (source.kind === Kind.Primitive || target.kind === Kind.Primitive)
            return source === target;
        // オブジェクト型の場合は、オブジェクトのプロパティの型を比較
        else if (source.kind === Kind.Object && target.kind === Kind.Object) {
            for (const [key, targetSymbol] of target.members) {
                const sourceSymbol = source.members.get(key);
                if (!sourceSymbol || !isAssignableTo(getValueTypeOfSymbol(sourceSymbol), getValueTypeOfSymbol(targetSymbol))) {
                    return false;
                }
            }
            return true;
        }
        // 関数型の場合は、関数の引数の型と戻り値の型を比較
        else if (source.kind === Kind.Function && target.kind === Kind.Function) {
            let targetSignature = target.signature;
            if (source.signature.typeParameters) {
                if (target.signature.typeParameters) {
                    const mapper = {
                        sources: target.signature.typeParameters.map(getTypeTypeOfSymbol),
                        targets: source.signature.typeParameters.map(getTypeTypeOfSymbol)
                    };
                    targetSignature = instantiateSignature(target.signature, mapper);
                }
            }
            // 関数の戻り値の型・引数の数・各引数の型を比較
            return isAssignableTo(source.signature.returnType, targetSignature.returnType)
                && source.signature.parameters.length <= targetSignature.parameters.length
                && source.signature.parameters.every((p, i) => isAssignableTo(getValueTypeOfSymbol(targetSignature.parameters[i]), getValueTypeOfSymbol(p)));
        }
        return false;
    }
}
//# sourceMappingURL=index.js.map