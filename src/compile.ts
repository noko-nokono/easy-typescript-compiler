import { scanner } from "./compiler/scanner/index.js";
import { parser } from "./compiler/parser/index.js";
import { binder } from "./compiler/binder/index.js";
import { checker } from "./compiler/checker/index.js";
import { transform } from "./compiler/transform/index.js";

const compile = (code: string) => {
  const _scanner = scanner(code);
  console.log('_scanner', _scanner);
  const _parser = parser(_scanner);
  console.log('_parser', _parser);
  binder(_parser);
  checker(_parser);
  const _transform = transform(_parser.statements);
  console.log('_transform', _transform);
};

const code = "var test: number = 1";

compile(code);