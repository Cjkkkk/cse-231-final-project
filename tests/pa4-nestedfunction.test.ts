import { assertPrint, assertFail, assertTCFail, assertTC } from "./asserts.test";
import { NUM, NONE, CLASS } from "./helpers.test"

describe("PA4 tests for nested function", () => {
    assertPrint("call a simple nested function", `
    def f() -> int:
        def g(a: int) -> int:
            return a + 1
        return g(4) + g(5)
    print(f())
    `, [`11`]);

    assertPrint("call a deep nested function", `
    def f() -> int:
        def g(a: int) -> int:
            def h(a: int) -> int:
                return a + 2
            return h(a) + 1
        def g1(a: int) -> int:
            return a + 1
        return g(4) + g1(5)
    print(f())
    `, [`13`]);

    assertPrint("call a nested function inside class method", `
    class A(object):
        def f(self: A, a: int) -> int:
            def g(a: int) -> int:
                return a * 2
            return g(a)
    a: A = None
    a = A()
    print(a.f(4))
    `, [`8`]);

    assertPrint("call a function referencing a non-local variable", `
    def f(a: int) -> int:
        def g(b: int) -> int:
            return a + b
        return g(4)
    print(f(3))
    `, [`7`]);

    assertPrint("call a function referencing a global variable", `
    a: int = 1
    def f() -> int:
        def g(b: int) -> int:
            return a + b
        return g(4)
    print(f())
    `, [`5`]);
});