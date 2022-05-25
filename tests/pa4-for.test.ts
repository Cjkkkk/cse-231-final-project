import { assertPrint, assertFail, assertTCFail, assertTC } from "./asserts.test";
import { NUM, NONE, CLASS, LIST, STRING } from "./helpers.test"

describe("PA4 tests for for-loops", () => {
    // 1
    assertPrint("for-loop-over-list", `
    x: int = 0
    i: int = 0
    for i in [1,2,3,4,5,6,7,8,9,10]:
        x = x + 1
    print(x)`, [`10`]);
    assertPrint("for-loop-over-string-1", `
    s: str = "ghkjl"
    i: str = ""
    j: str = ""
    for i in s:
        j = i + j
    print(j)`, [`ljkhg`]);
    assertPrint("for-loop-over-string-2", `
    s: str = "ghk"
    i: str = ""
    for i in s:
    print(i)`, [`g`, `h`, `k`]);
    assertTCFail("wrong-type-for-counter", `
    x:int = 0
    i: int = 0
    for i in [True, True]:
    x = x + 1`);
    assertTCFail("invalid-type-for-counter", `
    x:[int]=None
    y:str="asd"
    x=[1,2,3,4,5]
    for y in x:
    print(y)`);
    assertPrint("nested-for-loop", `
    x: int = 0
    i: int = 0
    j: int = 0
    for i in [1,2,3,4,5,6,7,8,9,10]:
        for j in [1,2,3,4,5,6,7,8,9,10]:
            x = x + 1
    print(x)`, [`100`]);
    assertTCFail("non-iterable-variable", `
    x:int=2
    y:int=1
    for y in x:
    print (y)`);
    assertPrint("for-loop-over-list-in-class", `
    class A(object):
        x:[int]=None
        def returnList(self:A)->[int]:
            return [1,2,3,4]

    a:A=None
    b:int=1
    a=A()
    for b in a.returnList():
        print(b)`, ["1", "2", "3", "4"]);
    assertPrint("for-loop-over-list-as-param-in-class", `
    class A(object):
        x:[int]=None
        def setList(self:A, y:[int]):
            self.x=y
        def returnList(self:A)->[int]:
            return self.x
            
    a:A=None
    c:int=1
    a=A()
    a.setList([1,2,3,4,5])
    for c in a.returnList():
        print(c)`, ["1", "2", "3", "4", "5"]);
    assertPrint("for-loop-over-list-as-memvar-in-class", `
    class A(object):
        x:[int]=None
        def setList(self:A, y:[int]):
            self.x=y
        def printList(self:A):
            a:int=1
            for a in self.x:
                print(a)
            
    a:A=None
    a=A()
    a.setList([1,2,3,4,5])
    a.printList()`, ["1", "2", "3", "4", "5"]);
    assertPrint("for-loop-over-string-as-memvar-in-class", `
    class A(object):
        x:str="asdfarawe"
        def getStr(self:A)->str:
            return self.x

    a:A=None
    b:str=""
    c:str=""
    a=A()
    for b in a.getStr():
        c = c + b
    print(c)`, ["asdfarawe"]);
    assertPrint("for-loop-over-string-as-param-in-class", `
    class A(object):
        x:str="asdfarawe"
        def setStr(self:A, y:str):
            self.x=y
        def getStr(self:A)->str:
            return self.x

    a:A=None
    b:str=""
    c:str="asdufojasdopifn"
    a=A()
    a.setStr(c)
    c=""
    for b in a.getStr():
        c = c + b
    print(c)`, ["asdufojasdopifn"]);
    assertFail("for-loop-over-none-list", `
    x:[int]=None
    y:int=1
    for y in x:
        print (y)`);
    assertFail("for-loop-over-list-contains-none", `
    class A(object):
        x:int=1
    x:[A]=None
    y:A=None
    x=[A(), None, A()]
    for y in x:
        print(y.x)`);
    assertPrint("for-loop-over-concat-int-list", `
    a:[int]=None
    b:[int]=None
    c:int=1
    a=[1,2,3]
    b=[4,5]
    for c in a+b:
        print(c)`, ["1", "2", "3", "4", "5"]);
    assertPrint("for-loop-over-inheritance-list", `
    class A(object):
        x:int=1

    class B(A):
        y:int=2
    
    a:[A]=None
    b:A=None
    a=[A(), B(), A()]
    for b in a:
        print(b.x)`, ["1", "1", "1"]);
    assertPrint("for-loop-over-concat-string-as-class-memvar", `
    class A(object):
        x:str="AA"
    
    a:A=None
    b:str="B"
    c:[A]=None
    c=[A(), A(), A()]
    for a in c:
        b = b + a.x
    print(b)`, ["BAAAAAA"]);
    assertTC("tc-for-loop-over-int-list", `
    a:[int]=None
    b:int=1
    c:int=2
    a=[1,2,3,4,5]
    for b in a:
        c=c+b
    b`, NUM);
    assertTC("tc-for-loop-over-string", `
    a:str="asasfdgas"
    b:str=""
    for b in a:
        b = b + a + "e"
    b`, STRING);
    assertPrint("for-loop-over-nested-list", `
    a:[[int]]=None
    b:[int]=None
    c:int=1
    a=[[1,2],[2,3]]
    for b in a:
        for c in b:
            print(c)`, ["1", "2", "2", "3"]);
    assertPrint("for-loop-over-nested-inheritance-list", `
    class A(object):
        x:int=1

    class B(A):
        y:int=2

    a:[[A]]=None
    b:[A]=None
    c:A=None
    a=[[A(), B()], [B(), A()]]
    for b in a:
        for c in b:
            print(c.x)`, ["1", "1", "1", "1"]);

    assertPrint("two-for-loops", `
a:[[int]]=None
b:[int]=None
c:int=1
i:int = 0
a=[[1,2],[2,3]]
for b in a:
    for c in b:
        i = i + c
for b in a:
    for c in b:
        i = i + c
print(i)`, ["16"]);
});

