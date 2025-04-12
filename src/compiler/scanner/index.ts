import { Token, Scanner } from "./type.js";

const keywords = {
  "function": Token.Function,
  "var": Token.Var,
  "type": Token.Type,
  "return": Token.Return,
}

/**
 * [全体像]
 * 1. scanner関数で文字列コードの字句解析（トークン化）処理を開始する
 * 2. scan関数を呼び出すたびに、現在の position から次のトークンを判別し、種類（token）と内容（text）を記録する
 * 3. 空白・文字列・数値・識別子・記号などに応じて、それぞれの条件分岐と補助関数（scanForward など）を用いて位置を進め、適切なトークンを設定する
 * 4. 識別子については予約語（keywords）との一致も確認し、適切なトークン種別を判別する
 * 5. position(), text(), token() により現在のスキャン結果を外部から安全に取得できるようにする
 */
export const scanner = (code: string): Scanner => {
  // コードのどの位置を解析しているかを判別する値
  let position = 0;
  // 解析したコードのテキストを格納する値（変数名や文字列など）
  let text = "";
  // 解析したトークンを格納する値
  let token = Token.BOF;

  // 解析している位置が、コードの長さを超えていないか（最後まで到達していないか）を判別
  // 解析している位置が、引数で受けた解析をする関数の条件に一致しているかを判別
  // 判別した結果、スキップすべき文字列配列に含まれている場合、解析している位置を進める
  function scanForward(pred: (charactor: string) => boolean) {
    while (position < code.length && pred(code.charAt(position))) {
      position++;
    }
  }

  function scan() {
    // 現在解析している位置が、空白・タブ・バックスペース・改行かどうかを判別する
    scanForward(isIgnorableCharacter)
    const start = position

    // 現在解析している位置が、最後かどうかを判別
    if (position === code.length) {
      token = Token.EOF
    }
    // 現在解析している位置が、ダブルクォーテーションかどうかを判別
    // ダブルクォーテーションで囲まれた値を文字列として判定
    else if (code.charAt(position) === '"') {
      position++
      scanForward(isDoubleQuotation)

      // ダブルクォーテーションが閉じられているかを判別
      if (code.charAt(position) !== '"') {
          throw new Error("unclosed string literal")
      }
      else {
          position++
      }

      // ダブルクォーテーションで囲まれた文字列を取得
      text = code.slice(start, position)
      token = Token.StringLiteral
    }
    // 現在解析している位置が、数値かどうかを判別
    else if (/[0-9]/.test(code.charAt(position))) {
      scanForward(isNumber)

      // 数値の値を取得
      text = code.slice(start, position)
      token = Token.NumericLiteral
    }
    // 現在解析している位置が、英数字またはアンダーバーかどうかを判別
    else if (/[_a-zA-Z]/.test(code.charAt(position))) {
      scanForward(isAlphaNumeral)

      // 識別子の値を取得
      text = code.slice(start, position)
      token = text in keywords ? keywords[text as keyof typeof keywords] : Token.Identifier
    }
    // 現在解析している位置が、ここまでの条件に当てはまらない値の場合
    else {
      position++
      switch (code.charAt(position - 1)) {
          case '=': 
              // イコールの後に続く文字がアローかどうかを判別
              if (code.charAt(position) === '>') {
                  position++
                  token = Token.Arrow
                  break
              }
              token = Token.Equals; break
          case ',': token = Token.Comma; break
          case ';': token = Token.Semicolon; break
          case ":": token = Token.Colon; break
          case "{": token = Token.OpenBrace; break
          case "}": token = Token.CloseBrace; break
          case "(": token = Token.OpenParen; break
          case ")": token = Token.CloseParen; break
          case "<": token = Token.LessThan; break
          case ">": token = Token.GreaterThan; break
          default: token = Token.Unknown; break
      }
    }
  };

  // position, text, tokenを関数で返す理由は以下の点があるため
  // 1. 最新の値をリアルタイムに取得するため
  // 2. 外部から値を変更されないようにするため
  return {
    scan,
    position: () => position,
    text: () => text,
    token: () => token,
  }
};

// 現在解析している位置が、空白・タブ・バックスペース・改行かどうかを判別する関数
const isIgnorableCharacter = (charactor: string): boolean => {
  return /[ \t\b\n]/.test(charactor);
}

// 現在解析している位置が、ダブルクォーテーションかどうかを判別する関数
const isDoubleQuotation = (charactor: string): boolean => {
  return /[^\"]/.test(charactor)
}

// 現在解析している位置が、数値かどうかを判別する関数
const isNumber = (charactor: string): boolean => {
  return /[0-9]/.test(charactor);
}

// 現在解析している位置が、英数字またはアンダーバーかどうかを判別
const isAlphaNumeral = (charactor: string): boolean => {
  return /[_a-zA-Z]/.test(charactor);
}