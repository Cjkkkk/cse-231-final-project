import { assertPrint, assertFail, assertTCFail, assertTC } from "./asserts.test";
import { NUM, NONE, CLASS } from "./helpers.test"

describe("PA4 tests for inheritance", () => {
    // 1
    assertTC("Pass subclass as function argument", `
    class A(object):
        pass
    
    class B(A):
        pass
    
    def f(a: A):
        pass
    b: B = None
    f(b)`, NONE);
    // 2
    assertTC("Pass subclass as function return value", `
    class A(object):
        pass
    
    class B(A):
        pass
    
    def f() -> A:
        b: B = None
        return b`, NONE);
    // 3
    assertTC("Pass subclass as method argument with nested inheritance", `
    class A(object):
        pass
    
    class B(A):
        pass
    
    class C(B):
        pass
    
    class D(object):
        def dumb(self: D, a: A):
            pass
    
    d: D = None
    c: C = None
    d = D()
    d.dumb(c)`, NONE);
    // 4
    assertTC("Pass subclass as function argument with nested inheritance", `
    class A(object):
        pass
    
    class B(A):
        pass
    
    class C(B):
        pass
    
    def f() -> A:
        c: C = None
        return c`, NONE);
    // 5
    assertTC("reference a field defined in superclass", `
    class A(object):
        a: int = 1
    
    class B(A):
        def f(self: B):
            self.a = self.a + 1`, NONE);
    // 6
    assertTCFail("Pass different class as function argument", `
    class A(object):
        pass
    
    class B(object):
        pass
    
    def f(a: A):
        pass
    b: B = None
    f(b)`);
    // 7
    assertTCFail("Redefine same field in sub class", `
    class A(object):
        a: int = 1
    
    class B(A):
        a: int = 2`);
    // 8
    assertPrint("calling a method", `
    class A(object):
        def f(self: A) -> int:
            return 1
    
    class B(A):
        def f(self: B) -> int:
            return 2
    
    def f(a: A) -> int:
        return a.f()

    b: B = None
    b = B()
    print(f(b))
    `, [`2`]);
    // 9
    assertPrint("calling a method defined in superclass", `
    class A(object):
        def f(self: A) -> int:
            return 1
    
    class B(A):
        pass

    b: B = None
    b = B()
    print(b.f())`,[`1`]);
    // 10
    assertPrint("change a field defined in superclass", `
    class A(object):
        a: int = 1
    
    class B(A):
        def f(self: B):
            self.a = self.a + 1
    
    b: B = None
    b = B()
    b.f()
    print(b.a)
    `, [`2`]);
});