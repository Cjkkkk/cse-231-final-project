import { assertPrint, assertFail, assertTCFail, assertTC } from "./asserts.test";
import { NUM, NONE, CLASS, LIST } from "./helpers.test"

describe("PA4 tests for list", () => {
    // 1
    assertTC("list-type", `
    a: [int] = None
    a = [0]
    a`, LIST(NUM));
    // 2
    assertTC("list-ele-type", `
    a: [int] = None
    a = [3,4,5]
    a[2]`, NUM);
    // 3
    assertTCFail("list-bad-ele-type", `
    a: [bool] = None
    a = [3,4,5]`);
    // 4
    assertPrint("list-idx-expr", `
    a: [int] = None
    a = [3,4,5]
    print(a[2])`, [`5`]);
    // 5
    assertFail("idx-out-of-bound", `
    a: [int] = None
    a = [3,4,5]
    print(a[10])`);
    // 6
    assertPrint("list-len", `
    a: [int] = None
    a = [3,4,5]
    print(len(a))`, [`3`]);
    // 7
    assertPrint("list-len-zero", `
    a: [int] = None
    a = []
    print(len(a))`, [`0`]);
    // 8
    assertTCFail("list-len-none", `
    a: [int] = None
    print(len(a))`);
    // 9
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
    // 10
    assertTC("list-ret-type", `
    def gen() -> [int]:
        return [1,2,3]
    a: [int] = None
    a = gen()
    a`, LIST(NUM));
});

