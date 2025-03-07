import { scanner } from "./compiler/scanner/index.js";
import { parser } from "./compiler/parser/index.js";
const compile = (code) => {
    const _scanner = scanner(code);
    console.log('_scanner', _scanner);
    const _parser = parser(_scanner);
    console.log('_parser', _parser);
};
const code = "var test: number = 1";
compile(code);
//# sourceMappingURL=compile.js.map