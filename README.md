[WIP] TypeScript Compiler

# 🛤️ 全体像

## 📚 用語

**🏷️ 文**
**🏷️ 式**

**🛑Symbol（シンボル）**

コンパイラの型解析で使われる識別子（名前）に対応する情報を管理するオブジェクト。
具体的には、変数、関数、クラス、型エイリアスなどの宣言情報を保持する役割を持っています。
主に Binder フェーズで作成され、Table 型はシンボルを管理するためのマップの役割を持っています。

```ts
var x = 10;
type Point = { x: number; y: number };
function foo() {}
```

| 名前    | 種類         | 宣言の位置                              |
| ------- | ------------ | --------------------------------------- |
| `x`     | 変数         | `var x = 10`                            |
| `Point` | 型エイリアス | `type Point = { x: number, y: number }` |
| `foo`   | 関数         | `function foo() {}`                     |

**📋 関数シグネチャ**

関数の型情報を表す定義のことを指しており、以下のような構成要素をを持っています。

1. 関数名 (省略される場合もある)
2. 引数の型情報
3. 戻り値の型情報
4. 型パラメータ (ジェネリック型などの場合)

```ts
function add(x: number, y: number): number {
  return x + y;
}
```

この例では、`add` 関数のシグネチャは `(x: number, y: number) => number` となります。

## ✅Scanner

## ✅Parser

## ✅Binder

## ✅Checker

## ✅Transform

## ✅Emitter
