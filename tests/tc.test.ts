import { expect } from 'chai';
import { tcProgram } from '../tc';
import { Stmt, ExprStmt } from '../ast';


describe('tc literal', () => {
    it('tc number', () => {
        const program: Stmt<any>[] = [{tag: "expr", expr: {tag: "literal", value: 987}}];
        const newProgram = tcProgram(program);
        // Note: we have to use deep equality when comparing objects
        expect(newProgram[0].tag).to.deep.equal("expr") 
        expect((newProgram[0] as ExprStmt<any>).expr.a).to.deep.equal({tag: "int"});
    })

    // TODO: add additional tests here to ensure traverseExpr works as expected
});
