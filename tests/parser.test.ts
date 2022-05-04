import { expect } from 'chai';
import { parse } from '../parser';

// We write tests for each function in parser.ts here. Each function gets its 
// own describe statement. Each it statement represents a single test. You
// should write enough unit tests for each function until you are confident
// the parser works as expected. 
describe('parse literal', () => {
    it('1', () => {
        const source = "987";
        const stmts = parse(source);
        // Note: we have to use deep equality when comparing objects
        expect(stmts[0]).to.deep.equal({tag: "expr", expr: {tag: "literal", value: 987}});
    })

    // TODO: add additional tests here to ensure traverseExpr works as expected
});

describe('parse assignment', () => {
    // TODO: add tests here to ensure traverseStmt works as expected
    it('1', () => {
        const source = "a = 1";
        const stmts = parse(source);
        // Note: we have to use deep equality when comparing objects
        expect(stmts[0]).to.deep.equal({ tag: "assign", name: {name: "a", tag: "name"}, value: {tag: "literal", value:1 }});
    })
});


describe('parses type', () => {
    it('1', () => {
        const source = "def f(a:int) -> Callable[[int], int]:\n    pass";
        const stmts = parse(source);

        // Note: we have to use deep equality when comparing objects
        expect(stmts[0]).to.deep.equal({
            tag: "func", 
            name: "f", 
            params: [{name: "a", type: {tag: "int"}}], 
            ret: {
                tag: "callable", 
                params: [{tag: "int"}],
                ret: {tag: "int"}
            }, 
            body: [{tag: "pass"}]});
    })

    it('2', () => {
        const source = "def f1(a:List[int]) -> Callable[[int], int]:\n    pass";
        const stmts = parse(source);

        // Note: we have to use deep equality when comparing objects
        expect(stmts[0]).to.deep.equal({
            tag: "func", 
            name: "f1", 
            params: [
                {
                    name: "a", 
                    type: {
                        tag: "list",
                        type: {tag: "int"}
                    }
                }
            ], 
            ret: {
                tag: "callable", 
                params: [
                    {tag: "int"}
                ],
                ret: {tag: "int"}
            }, 
            body: [{tag: "pass"}]});
    })

    it('3', () => {
        const source = "def f2(a:Tuple[int, int]) -> Callable[[int], Callable[[int], int]]:\n    pass";
        const stmts = parse(source);

        // Note: we have to use deep equality when comparing objects
        expect(stmts[0]).to.deep.equal({
            tag: "func", 
            name: "f2", 
            params: [
                {
                    name: "a", 
                    type: {
                        tag: "tuple", 
                        members: [
                            {tag: "int"}, 
                            {tag: "int"}
                        ]
                    }
                }
            ], 
            ret: {
                tag: "callable", 
                params: [
                    {tag: "int"}
                ],
                ret: {
                    tag: "callable",
                    params: [{tag: "int"}],
                    ret: {tag: "int"}
                }
            }, 
            body: [{tag: "pass"}]});
    })


    it('3', () => {
        const source = "class B(A):\n    pass";
        const stmts = parse(source);

        // Note: we have to use deep equality when comparing objects
        expect(stmts[0]).to.deep.equal({
            tag: "class", 
            name: "B", 
            super: "A",
            methods: [],
            fields: []
    })})
    // TODO: add additional tests here to ensure traverseExpr works as expected
});