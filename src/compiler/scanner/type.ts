// 解析している値を識別するためのトークンの種類を管理
export enum Token {
  Function,         // 関数
  Var,              // 変数
  Type,             // 型
  Return,           // 戻り値
  Equals,           // 代入
  NumericLiteral,   // 数値
  StringLiteral,    // 文字列
  Identifier,       // 識別子
  Newline,          // 改行
  Semicolon,        // セミコロン
  Comma,            // カンマ
  Colon,            // コロン
  Arrow,            // アロー関数
  Whitespace,       // 空白
  OpenBrace,        // {
  CloseBrace,       // }
  OpenParen,        // (
  CloseParen,       // )
  LessThan,         // <
  GreaterThan,      // >
  Unknown,          // 不明
  BOF,              // 開始
  EOF,              // 終了
}

// scannerで返される各種値の型
export type Scanner = {
  scan(): void
  position: () => number
  text: () => string
  token: () => Token
}
