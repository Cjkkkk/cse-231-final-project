import { assertPrint, assertFail, assertTCFail, assertTC } from "./asserts.test";
import { NUM, NONE, CLASS, STRING } from "./helpers.test"

describe("PA4 tests for string", () => {
  // TC
  // 1
  assertTC("string-type", `
  s:str = "test"
  s`, STRING);
  // 2
  assertTC("string-index-type", `
  s:str = "test"
  s[0]`, STRING);
  // 3
  assertTC("string-len-type", `
  s:str = "test"
  len(s)`, NUM);
  assertPrint("string-len", `
  s:str = "test"
  print(len(s))`, [`4`]);
  assertPrint("string-index-len", `
  s:str = "test"
  print(len(s[0]))`, [`1`]);
  // string construct failures
  // 1
  assertTCFail("string-none-init-value-type", `
  s:str = None`);
  // 2
  assertTCFail("string-not-none-init-value-type", `
  s:str = 2`);
  // assignment failures
  // 1
  assertTCFail("string-assign-bad-type", `
  s:str = "test"
  s[0] = 1`);
  // 2
  assertTCFail("string-assign-type", `
  s:str = "test"
  s[0] = "g"`);
  // index
  // valid
  // 1
  assertPrint("string-index-int-valid", `
  s:str = "test"
  print(s[0])`, [`t`]);
  // 2
  assertPrint("string-index-len-valid", `
  s:str = "testing"
  print(s[len(s)-1])`, [`g`]);
  // not valid
  // 1
  assertFail("string-index-len-out-of-bound-1", `
  s:str = "test"
  s[-1]`);
  // 2
  assertFail("string-index-len-out-of-bound-2", `
  s:str = "test"
  s[6]`);
  // 3
  assertFail("string-index-len-out-of-bound-3", `
  s:str = "test"
  s[len(s)]`);
  // 4
  assertTCFail("string-invalid-index", `
  s:str = "test"
  t:bool=True
  s[t]`);
  // 5
  assertTCFail("string-invalid-index", `
  s:str = "test"
  t:str = "index"
  s[t]`);
  // len
  // valid
  // 1
  assertPrint("string-len-int-valid-1", `
  s:str="a longer test string"
  print(len(s))
  `, [`20`]);
  // 2
  assertPrint("string-len-int-valid-2", `
  s:str=""
  print(len(s))
  `, [`0`]);
  // not valid
  // Note: most of type check of len() is included in tests of list
  // skip here

  // strings concat
  // 1
  assertTC("string-concat-type", `
  s:str = "ssss"
  t:str = "ttt"
  s+t`, STRING);
  // 2
  assertTC("string-concat-len-type", `
  s:str = "ssss"
  t:str = "ttt"
  len(s+t)`, NUM);
  // 3
  assertTC("string-concat-index-type", `
  s:str = "ssss"
  t:str = "ttt"
  len(s+t)`, NUM);
  // 4
  assertPrint("string-concat-print", `
  s:str = "sss"
  t:str = "t"
  print(s+t)`, [`ssst`]);
  // 5
  assertPrint("string-concat-index-print", `
  s:str = "sss"
  t:str = "tttt"
  print((s+t)[6])`, [`t`]);
  // 6
  assertPrint("string-concat-len-print", `
  s:str = "sss"
  t:str = "tttt"
  print(len(s+t))`, [`7`]);
  // TODO: string as literal
  // 1
  assertTCFail("string-as-literal-bad-type-1", `
  a:int = "int"`);
  // 2
  assertTCFail("string-as-literal-bad-type-2", `
  a:int = 1
  a + "s"`);
  assertPrint("string-as-param-and-return", `
def f(s:str, i:int) -> str:
  return s[i]
s:str = "qwerty"
print(f(s, 3))
  `, ['r']);
});