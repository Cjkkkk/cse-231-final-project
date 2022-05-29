import { assertPrint, assertFail, assertTCFail, assertTC } from "./asserts.test";
import { NUM, NONE, CLASS, LIST, STRING } from "./helpers.test"

describe("PA4 tests for list", () => {
    // 1
    assertTC("list-type", `
    a: [int] = None
    a = [0]
    a`, LIST(NUM));
    assertTC("empty-list", `
    a: [int] = None
    a = []
    a`, LIST(NUM));
    assertTC("string-list", `
    a: [str] = None
    a = ["abs", "ttttttttttt"]
    a`, LIST(STRING));
    assertTC("list-object-type", `
a:[object] = None
class A(object):
    a:int = 1
b:object= None
b = object()
a = [b]
a`, LIST("object"));
    assertTC("list-object-type-2", `
    [1, True]`, LIST("object"));
    // 2.1
    assertTC("list-ele-type", `
    a: [int] = None
    a = [3,4,5]
    a[2]`, NUM);
    // 2.2
    assertTCFail("list-bad-ele-type", `
    a: [bool] = None
    a = [3,4,5]`);
    // 2.3
    assertTCFail("list-diff-ele-type", `
    a: [bool] = None
    a = [True, 4, None]`);
    // 3.1
    assertPrint("list-idx-expr", `
    a: [int] = None
    a = [3,4,5]
    print(a[2])`, [`5`]);
    assertPrint("string-list-idx-expr", `
    a: [str] = None
    c:str = "gkl"
    a = ["abs", c, "ttttttttttt"]
    print(a[len(a)-1])`, [`ttttttttttt`]);
    // 3.2
    assertFail("idx-out-of-bound", `
    a: [int] = None
    a = [3,4,5]
    print(a[10])`);
    // 3.3
    assertFail("idx-out-of-bound", `
    a: [int] = None
    a = [3,4,5]
    print(a[-1])`);
    // 3.4
    assertTCFail("idx-not-int", `
    a: [int] = None
    t: bool = True
    a = [3,4,5]
    print(a[t])`);
    // 3.5
    assertTCFail("wrong-type-idx", `
    t: bool = True
    print(t[4])`);
    // 4.1
    assertPrint("list-len", `
    a: [int] = None
    a = [3,4,5]
    print(len(a))`, [`3`]);
    // 4.2
    assertPrint("list-len-zero", `
    a: [int] = None
    a = []
    print(len(a))`, [`0`]);
    // 4.3
    assertFail("list-len-none", `
    a: [int] = None
    print(len(a))`);
    // 4.4
    assertTCFail("len-bad-arg", `
    t: bool = True
    a: int = 0
    a = len(t)`);
    // 5
    assertPrint("list-arg", `
    def contains(items:[int], x:int) -> bool:
        i:int = 0
        while i < len(items):
            if items[i] == x:
                return True
            i = i + 1
        return False

    if contains([4, 8, 15, 16, 23], 15):
        print(True)
    else:
        print(False))`, [`True`]);
    assertPrint("list-param-with-idx-inside-functions", `
    def get_index(items:[int], n:int) -> int:
        return items[n]

    print(get_index([4, 8, 15, 16, 23], 3))`, [`16`]);
    // 6
    assertTC("list-ret-type", `
    def gen() -> [int]:
        return [1,2,3]
    a: [int] = None
    a = gen()
    a`, LIST(NUM));
    // 7
    assertTC("nested-list", `
    a: [[int]] = None
    a = [[1,2,3], [4,5,6]]
    a`, LIST(LIST(NUM)));
    // 8
    assertPrint("list-obj-ele", `
    class C(object):
        x:int = 345
    a: [C] = None
    a = [C(), C(), C()]
    print(a[1].x)`, [`345`]);
    assertTCFail("mix-obj-type", `
    class C(object):
        x:int = 345
    class D(object):
        x:int = 567
    a: [C] = None
    a = [None, D(), C()]`);
    assertTCFail("mix-obj-type", `
    class C(object):
        x:int = 345
    class D(object):
        x:int = 567
    a: [C] = None
    a = [D(),None, C()]`);
    assertPrint("mix-inheritance-obj", `
    class C(object):
        x:int = 345
    class D(C):
        y:int = 567
    a: [C] = None
    a = [None, D(), C()]
    print(a[1].x)`, [`345`]);
    // 9
    assertFail("list-of-none", `
    class C(object):
        x:int = 345
    def f():
        return
    a: [C] = None
    a = [f(), f(), None]
    print(a[1].x)`);
    assertPrint("list-has-none", `
    class C(object):
        x:int = 345
    def f():
        return
    a: [C] = None
    a = [None, C(), f()]
    print(a[1].x)`, ['345']);
    // 10.1
    assertPrint("list-assign", `
    a: [int] = None
    b: [int] = None
    a = [1,2,3]
    b = a
    print(b[1])`, [`2`]);
    // 10.2
    assertTCFail("list-assign-type", `
    a: [int] = None
    b: [bool] = None
    a = [1,2,3]
    b = a`);
    //10.3
    assertPrint("list-is-1", `
    a: [int] = None
    b: [int] = None
    a = [1,2,3]
    a = b
    print(b is a)`, [`True`]);
    assertPrint("list-is-2", `
    a: [int] = None
    b: [int] = None
    print(b is a)`, [`True`]);
    assertPrint("list-is-3", `
    a: [int] = None
    b: [int] = None
    a = [1,2,3]
    print(b is a)`, [`False`]);
    assertPrint("list-is-4", `
a:[str] = None
class C(object):
    a:int = 1
c:C=None
c=C()
print(a is None)
print(c is a)
print(None is c)
print(None is a)
`, [`True`, `False`, `False`, `True`]);
    // 11
    assertPrint("list-concat", `
    a: [int] = None
    b: [int] = None
    a = []
    b = [4569]
    a = a + b
    print(a[0])`, [`4569`]);
    assertPrint("list-concat-2", `
    a: [int] = None
    b: [int] = None
    c: [int] = None
    a = [3,4,5]
    b = [1,2,3]
    c = a + b
    print(c[4])`, [`2`]);
    assertPrint("list-concat-empty", `
    a: [int] = None
    b: [int] = None
    a = []
    b = []
    a = a + b
    print(len(a))`, [`0`]);
    assertPrint("list-concat-itself", `
    a: [int] = None
    b: [int] = None
    a = [1,2,3,4,5,6,7,8,9,10]
    a = a + a
    print(len(a))`, [`20`]);
    assertTCFail("list-concat-diff-type", `
    a: [int] = None
    b: [bool] = None
    a = []
    b = [True, False]
    a = a + b`);
    assertFail("list-concat-none-1", `
    a: [int] = None
    b: [int] = None
    a = a + b`);
    assertFail("list-concat-none-2", `
    a: [int] = None
    b: [int] = None
    a = [0,1,2]
    a = a + b`);
    assertPrint("list-concat-object-type", `
class C(object):
    x:int = 345
class D(C):
    y:int = 123
def f():
    return
b: [C] = None
b = [C(), D(), None]
print(([f(), f(), None]+b)[4].x)`, [`345`]);
});

