import { assertPrint, assertFail, assertTCFail, assertTC, assertFailContain } from "./asserts.test";
import { NUM, NONE, CLASS, LIST } from "./helpers.test"

describe("PA4 tests for global and nonlocal", () => {
    // 1
    assertPrint("global-var", `
x:int = 1
def f():
    global x
    x = x + 1
f()
print(x)`,  ["2"]);
    assertFailContain("global-redefine", `
x:int = 1
def f(x:int):
    global x
    x = x + 1`, `Redefine`);
    assertPrint("global-order", `
def f():
    y:int = 1
    global x
    z:int = 2
    x = x + y + z
x:int = 5
f()
print(x)`, [`8`]);
    assertFailContain("no-scope", `
global x
x:int = 5`, `not parse`);
    assertPrint("global-in-nested-1", `
x:int = 1
def f()->int:
    global x
    def g()->int:
        return x
    x = x + 1
    return g()
print(f())`, [`2`]);
    assertFailContain("nonlocal-of-a-global", `
x:int = 1
def f()->int:
    global x
    def g()->int:
        nonlocal x
        return x + 1
    return g()
print(f())`, `not a nonlocal`);
    assertPrint("global-in-nested-2", `
x:int = 1
def f():
    global x
    def g():
        global x
        x = x + 1
    g()
    x = x + 1
f()
print(x)`, [`3`]);

});

