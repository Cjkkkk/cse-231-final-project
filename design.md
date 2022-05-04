# closure, first-class function
(1) lift all the function to the top level, add prefix to avoid name collision.

(2) add extra parameter `closure` to all the function. (maybe just function not defined in top level)

(3) add closure class definition and function object class. All function pointer are represented as function object which contains a function pointer and a closure.

```python
def f(a:int, d: int) -> Callable[[int, int], int]:
    def f1(b: int, c: int) -> int:
        return a + b + c + d

    def f2(b: int, c: int) -> int:
        return a + b - c  
    if a > 0:
        return f1
    else:
        return f2
```
=> equal to this

```python
# generate following
def f(a:int, d: int) -> Closure:
    if a > 0:
        f1: f_f1_closure = None
        f1.a = a
        f1.d = d
        return f1
    else:
        f2: f_f2_closure = None
        f2.a = a
        return f2

class callable_int_int_int_closure(object): 
    def apply(self: callable_int_int_int_closure, b: int, c: int) -> int:
        pass


class f_f1_closure(callable_int_int_int_closure):
    a: int = 0
    d: int = 0
    def apply(self: f_f1_closure, b: int, c: int) -> int:
        return self.a + b + c + self.d

class f_f2_closure(callable_int_int_int_closure):
    a: int = 0
    def apply(self: f_f2_closure, b: int, c: int) -> int:
        return self.a + b - c
```