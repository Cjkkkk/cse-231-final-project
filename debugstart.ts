import { parser } from "lezer-python";
import { stringifyTree } from "./treeprinter";
import { parse } from "./parser";
import { compile } from "./compiler";
import { tcProgram } from "./tc";
import { ExprStmt } from "./ast"

var source = `
if a > 1:
    a = 1
elif a < 1:
    a = 2
else:
    a = 3

pass
`


source = `
def f(a:int, b:int) -> int:
    a = a + b
    b = b + a
    return a
`

source = `
while a > 1:
    a = 1
    b = 2
`



source = `
if c > 10:
    c = 11
else:
    c = 22
`

source = `
x: int = 1
x = x + 1
`

source = `
def f1() -> int:
    test: int = 1
    return test
`

source = `
class A(object):
    a: int = 1
    b: bool = True
    def new(self: A, a: int, b: bool):
        self.a = a
        self.b = b

a:A = None
a.new(4, True)
a.a
`

// // Script
// //   ExpressionStatement
// //     MemberExpression
// //       MemberExpression
// //         VariableName-->a
// //         .
// //         PropertyName
// //       .
// //       PropertyName

// source = `
// a.A.A
// `

// // Script
// //   ExpressionStatement
// //     CallExpression-->a.A.A()
// //       MemberExpression
// //         MemberExpression
// //           VariableName-->a
// //           .
// //           PropertyName-->A
// //         .
// //         PropertyName-->A
// //       ArgList
// //         (
// //         )
// source = `
// a.A.A()
// `

// // Script
// //   ExpressionStatement
// //     CallExpression-->A()
// //       VariableName-->A
// //       ArgList
// //         (
// //         )

// source = `
// A()
// `


// // Script
// //   ExpressionStatement
// //     CallExpression-->a.A()
// //       MemberExpression
// //         VariableName-->a
// //         .
// //         PropertyName-->A
// //       ArgList
// //         (
// //         )

// source = `
// a.A()
// `

// // Script
// //   ExpressionStatement
// //     CallExpression-->a.A().B()
// //       MemberExpression
// //         CallExpression-->a.A()
// //           MemberExpression
// //             VariableName-->a
// //             .
// //             PropertyName-->A
// //           ArgList
// //             (
// //             )
// //         .
// //         PropertyName-->B
// //       ArgList
// //         (
// //         )

// source = `
// a.!().B()
// `


// type Type =
//   | "int"
//   | "bool"
//   | "none"
//   | { tag: "object", class: string }

// function typeCheck(source: string) : Type {
//     const stmts = parse(source);
//     const types = tcProgram(stmts);
//     const lastType = (types[types.length - 1] as ExprStmt<any>).expr.a;
//     console.log(types[types.length - 1])
//     if (lastType === "int" || lastType === "bool" || lastType === "none") return lastType;
//     else {
//         return {tag: "object", class: lastType};
//     }
// }


// console.log(typeCheck(`
// x : int = 1
// y : int = 2
// if x < y:
//     pass
// else:
//     x = -x
// x
// `))

source = `
class C(object):
    def f(self: C) -> int:
        if True:
            return 0
        else:
            return`


source = `
def f(a:int) -> Callable[[int], int]:
    pass

def f1(a:List[int]) -> Callable[[int], int]:
    pass


def f2(a:Tuple[int, int]) -> Callable[[int], Callable[[int], int]]:
    pass
`

source = `
class A(object):
    a: int = 1
    def f1(self: A) -> int:
        return 1
            
class B(A):
    def f1(self: B) -> int:
        return 2


class C(B):
    def f1(self: C) -> int:
        return 4

def f(a: A) -> int:
    return a.f1()

def f1() -> A:
    return B()

c: C = None
a: A = None
c = C()
a = f1()
print(f(c))
print(f(a))
`


source = `
print(100 + 20 + 3)
`
const t = parser.parse(source);
console.log(stringifyTree(t.cursor(), source, 0));

const stmts = parse(source);
console.log(stmts)
console.log(compile(source))