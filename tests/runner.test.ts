import { compile, run } from '../compiler';
import { expect, assert } from 'chai';
import { importObject } from './import-object.test';
import 'mocha';

function runTest(source: string) {
    return run(compile(source), importObject);
}

// Clear the output before every test
beforeEach(function () {
    importObject.output = "";
});


describe('test correctness', () => {
    const config = { importObject };
    it('returns the right number', async () => {
        var result = await runTest("987");
        expect(result).to.equal(987);
        var result = await runTest("2 + 3");
        expect(result).to.equal(5);
    });

    it('print function', async () => {
        await runTest("print(11)\nprint(True)\nprint(None)");
        expect(importObject.output).to.equal("11\nTrue\nNone\n");
    });

    it('reference itself', async () => {
        await runTest("x:int = 1\nx = x+1\nprint(x)");
        expect(importObject.output).to.equal("2\n");
    });

    it('expression', async () => {
        await runTest("x:int = 0\nx=(2 + 3) * (5 + 10 // 4)\nprint(x)");
        expect(importObject.output).to.equal("35\n");
    });
});

describe('test operations', () => {
    const config = { importObject };

    it('number operation', async () => {
        await runTest(`
            print(1+2)
            print(12-8)
            print(4*5)
            print(9//3)
            print(10 % 3)
        `);
        expect(importObject.output).to.equal("3\n4\n20\n3\n1\n");
    });

    it('relational operation', async () => {
        await runTest(`
            print(1>2)
            print(1<2)
            print(3 >= 4)
            print(3 <= 4)
            print(5 == 6)
            print(6!=10)
            print(True == True)
        `);
        expect(importObject.output).to.equal("False\nTrue\nFalse\nTrue\nFalse\nTrue\nTrue\n");
    });

    it('is operation', async () => {
        await runTest(`
            print(None is None)
        `);
        expect(importObject.output).to.equal("True\n");
    });

    it('unary operation', async () => {
        await runTest(`
            y:int = 0\nx:int=1\ny=-5\nx=-y\nprint(x)\nprint(-(-x))
            print(-2)
            print(-(-4))
            print(not True)
            print(not False)
        `);
        expect(importObject.output).to.equal("5\n5\n-2\n4\nFalse\nTrue\n");
    });

    it('operation error', async () => {
        try {
            await runTest(`
                print(1+True)
            `);
            assert(false);
        } catch (error) {
            expect(error.name).to.equal("TypeError");
        }
        try {
            await runTest(`
                y:bool = True
                x:int = 1
                x = y
            `);
            assert(false);
        } catch (error) {
            expect(error.name).to.equal("TypeError");
        }
    });

    // TODO: test "is"
    // it('is operation', async () => {
    //     await runTest("1 is 2");
    //     expect(importObject.output).to.equal("False\n");
    // });

});

describe('test control flow', () => {
    const config = { importObject };

    it('pass expression', async () => {
        await runTest("x:int=1\npass\nprint(x)");
        expect(importObject.output).to.equal("1\n");
    });

    it('if expression', async () => {
        await runTest(`
            x:int = 3
            if x > 2:
                print(x)
            else:
                print(-x)
        `);
        expect(importObject.output).to.equal("3\n");
    });

    it('elif expression 1', async () => {
        await runTest(`
            x:int = 25
            if x < 2:
                print(0)
            elif x < 10:
                print(1)
            elif x > 30:
                print(2)
            else:
                print(3)
        `);
        expect(importObject.output).to.equal("3\n");
    });

    it('elif expression 2', async () => {
        await runTest(`
            x:int = 5
            if x <= 2:
                x=0
            elif x <= 10:
                x=1
            elif x >= 30:
                x=2
            else:
                x=3
            print(x)
        `);
        expect(importObject.output).to.equal("1\n");
    });

    it('while expression', async () => {
        await runTest(`
            limit:int = 100
            x:int = 1
            while x < limit:
                x = x + 1
            print(x)
        `);
        expect(importObject.output).to.equal("100\n");
    });

    // it('prints a unary operation 3', async () => {
    //     await runTest("y = -5\nx=-y\nprint(x)\nprint(-(-x))");
    //     expect(importObject.output).to.equal("5\n5\n");
    // });

});

describe('test functions', () => {
    const config = { importObject };

    it('function definition', async () => {
        await runTest(`
            x:int = 10
            def fun(x:int)->int:
                y:int = 0
                y = x
                x = 1
                return x
            z:int = 0
            z = fun(x)
            print(z)
        `);
        expect(importObject.output).to.equal("1\n");
    });


    it('local var', async () => {
        await runTest(`
            x:int = 10
            def fun1(x: int):
                x = 1
                return
            def fun2():
                x:int = 1
                return
            fun1(x)
            print(x)
            x = 10
            fun2()
            print(x)
        `);
        expect(importObject.output).to.equal("10\n10\n");
    });

    it('function 1', async () => {
        await runTest(`
                y:bool = False
                def f(x:int)->bool:
                    return x == 1
                y = f(1)
                print(y)
        `);
        expect(importObject.output).to.equal("True\n");
    });

    it('function 2', async () => {
        await runTest(`
                x:int = 4
                y:int = 0
                def sqr(x:int)->int:
                    return x * x
                y = sqr(3) + sqr(x)
                print(y)
        `);
        expect(importObject.output).to.equal("25\n");
    });

    it('none', async () => {
        await runTest(`
            def fun1():
                return None
            def fun2():
                return
            print(fun1())
            print(fun2())
        `);
        expect(importObject.output).to.equal("None\nNone\n");
    });

    it('function test', async () => {
        const source = `
            x: int = 1
            def f(x: int) -> int:
                y:int = 2
                y = x + y + 1
                x = x + 1
                return x * y
            print(f(x))
            print(x)
        `
        await runTest(source);
        expect(importObject.output).to.equal("8\n1\n");
    });

    it('function test', async () => {
        const source = `
            def f(x:int)->int:
            return x * x
            a:int = 1
            res:int = 0
            while a <= 10:
                res = res + f(a)
                a = a + 1
            print(res)
        `
        await runTest(source);
        expect(importObject.output).to.equal("385\n");
    });

    it('function error', async () => {
        try {
            await runTest(`
                def f(x:int)->int:
                    y:bool = False
                    return y
            `);
            assert(false);
        } catch (error) {
            expect(error.name).to.equal("TypeError");
        }
        try {
            await runTest(`
                y:bool = False
                def f(x:int)->int:
                    return x
                f(y)
            `);
            assert(false);
        } catch (error) {
            expect(error.name).to.equal("TypeError");
        }
        try {
            await runTest(`
                y:int = 1
                def f(x:int)->int:
                    return x
                f(y, y)
            `);
            assert(false);
        } catch (error) {
            expect(error.message).to.equal("Expected 1 arguments but got 2");
        }

        try {
            await runTest(`
                y:int = 1
                def f(x:int)->bool:
                    return x == 1
                y = f(1)
            `);
            assert(false);
        } catch (error) {
            expect(error.name).to.equal("TypeError");
        }

    });

    it('function variable scope error', async () => {
        try {
            await runTest(`
                x:int = 10
                def fun():
                    x = 1
                    return
                fun()
                print(x)
            `);
            assert(false);
        } catch (error) {
            expect(error.message).to.equal("Reference error: x is not defined");
        }

        try {
            await runTest(`
                y:bool = False
                def f(x:int)->int:
                    return x
                f(y)
            `);
            assert(false);
        } catch (error) {
            expect(error.name).to.equal("TypeError");
        }
        try {
            await runTest(`
                y:int = 1
                def f(x:int)->int:
                    return x
                f(y, y)
            `);
            assert(false);
        } catch (error) {
            expect(error.message).to.equal("Expected 1 arguments but got 2");
        }

        try {
            await runTest(`
                y:int = 1
                def f(x:int)->bool:
                    return x == 1
                y = f(1)
            `);
            assert(false);
        } catch (error) {
            expect(error.name).to.equal("TypeError");
        }

    });


    it('redefinition', async () => {
        try {
            await runTest(`
                x:int = 1
                x:int = 2
            `);
            assert(false);
        } catch (error) {
            expect(error.message).to.equal("Redefine symbol: x");
        }

        try {
            await runTest(`
                x:int = 1
                def f(x:int)->int:
                    x:int = 1
                    return x
                x = f(x)
            `);
            assert(false);
        } catch (error) {
            expect(error.message).to.equal("Redefine symbol: x");
        }
    });

});


describe('test class', () => {
    const config = { importObject };

    it('Pass subclass as function argument', async () => {
        await runTest(`
            class A(object):
                pass
            
            class B(A):
                pass
            
            def f(a: A):
                pass
            b: B = None
            f(b)
        `);
    });

    it('Pass subclass as function return value', async () => {
        await runTest(`
            class A(object):
                pass
            
            class B(A):
                pass
            
            def f() -> A:
                b: B = None
                return b
        `);
    });


    it('Pass subclass as method argument with nested inheritance', async () => {
        await runTest(`
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
            d.dumb(c)
        `);
    });

    it('Pass subclass as function argument with nested inheritance', async () => {
        await runTest(`
            class A(object):
                pass
            
            class B(A):
                pass
            
            class C(B):
                pass
            
            def f() -> A:
                c: C = None
                return c
        `);
    });

    it('Pass different class as function argument', async () => {
        try {
            await runTest(`
                class A(object):
                    pass
                
                class B(object):
                    pass
                
                def f(a: A):
                    pass
                b: B = None
                f(b)
            `);
            assert(false);
        } catch (error) {
            expect(error.name).to.equal("TypeError");
        }
    });


    it('Pass different class as function return value', async () => {
        try {
            await runTest(`
                class A(object):
                    pass
                
                class B(object):
                    pass
                
                def f() -> A:
                    b: B = None
                    return b
            `);
            assert(false);
        } catch (error) {
            expect(error.name).to.equal("TypeError");
        }
    });


    it('Redefine same field in sub class', async () => {
        try {
            await runTest(`
                class A(object):
                    a: int = 1
                
                class B(A):
                    a: int = 2
            `);
            assert(false);
        } catch (error) {
            expect(error.name).to.equal("TypeError");
        }
    });


    // it('reference same field in super class', async () => {
    //     try {
    //         await runTest(`
    //             class A(object):
    //                 a: int = 1
                
    //             class B(A):
    //                 def f(self: B):
    //                     self.a = 2
    //         `);
    //         assert(false);
    //     } catch (error) {
    //         expect(error.message).to.equal("TypeError");
    //     }
    // });
})
