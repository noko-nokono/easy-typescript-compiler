import { scanner } from "./compiler/scanner/index";

const compile = (code: string) => {
  const _scanner = scanner(code);
  console.log('_scanner', _scanner);
};

const code = "var test = 1";

compile(code);