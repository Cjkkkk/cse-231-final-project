import { assertPrint, assertFail, assertTCFail, assertTC, assertFailContain } from "./asserts.test";
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
    assertTCFail("define a method different from superclass", `
    class A(object):
        def f(self: A) -> int:
            return 1
    
    class B(A):
        def f(self: B) -> bool:
            return True`);
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
    // 11
    assertFailContain("change inherited function signature", `
class A(object):
    def f(self: A, a: A) -> A:
        return a

class B(A):
    def f(self: B, b: B) -> B:
        return b
    `, `signature`);

    // 12
    assertTCFail("bad self parameter", `
class M(object):
    def f(self: A, a: int) -> int:
        return a`);    
    
    // 13
    assertPrint("complex method parameter", `
class M(object):
    def f(self: M, a: int) -> int:
        return a

class A(object):
    a: int = 1
    def f(self: A, p:int) -> int:
        return self.a + p
    def add(self: A, p:int, q:int) -> int:
        return self.a + p + q

class B(A):
    def f(self: B, q:int) -> int:
        return self.a + q + q

m: M = None
a: A = None
b: B = None
m = M()
a = A()
b = B()
print(b.add(a.f(m.f(1)), m.f(2)))`, [`5`]);
});
