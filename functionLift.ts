import { write } from 'fs';
import {Stmt, Expr, Type, FuncStmt} from './ast';
type Func = {name: string, closure: Var[]};
type FuncMap = Map<string, Func>;
type FuncMapList = FuncMap[];
type Var = {name: string, type: Type, scope: string};
type VarMap = Map<string, Var>;
type VarMapList = VarMap[];



function getExprVarName(expr: Expr<any>, names: Set<string>) {
    switch(expr.tag) {
        case "call": {
            expr.args.map((v) => getExprVarName(v, names));
            break;
        }
        case "binary": {
            getExprVarName(expr.lhs, names);
            getExprVarName(expr.rhs, names);
            break;
        } 
        case "name": {
            names.add(expr.name);
            break;
        }
        case "literal": {
            break;
        }
        case "unary": {
            getExprVarName(expr.expr, names);
            break;
        } 
        case "getfield": {
            getExprVarName(expr.obj, names);
            break;
        }
        case "method": {
            getExprVarName(expr.obj, names);
            expr.args.map((v) => getExprVarName(v, names));
            break;
        } 
        case "array": {
            expr.eles.map(e => getExprVarName(e, names));
            break;
        }
        case "index": {
            getExprVarName(expr.obj, names);
            getExprVarName(expr.idx, names);
            break;
        }
        default: {
            throw new Error(`Unsupported expr type: `);
        }
    }
}



function getStmtsVarName(stmts: Stmt<any>[], names: Set<string>) {
    stmts.forEach((stmt) => {
        switch (stmt.tag) {
            case "func": {
                getStmtsVarName(stmt.body, names);
                break;
            } case "assign": {
                getExprVarName(stmt.value, names);
                break;
            } case "expr": {
                getExprVarName(stmt.expr, names);
                break;
            } case "if": {
                getExprVarName(stmt.if.cond, names);
                getStmtsVarName(stmt.if.body, names);
                stmt.elif.forEach((e) => {
                    getExprVarName(e.cond, names);
                    getStmtsVarName(e.body, names);
                    return e;
                });
                getStmtsVarName(stmt.else, names);
                break;
            } case "while": {
                getStmtsVarName(stmt.while.body, names);
                getExprVarName(stmt.while.cond, names);
                break;
            } case "pass": {
                break;
            } case "return": {
                getExprVarName(stmt.value, names);
                break;
            } case "var": {
                break;
            } case "scope": {
                // DSC TODO 
                break;
            } case "for": {
                getExprVarName(stmt.cnt, names);
                getExprVarName(stmt.array, names);
                getStmtsVarName(stmt.body, names);
            } default: {
                throw new Error(`Unsupported stmt type:`);
            }
        }
    });
}


function rewriteExpr(expr: Expr<any>, funcList: FuncMapList, varList: VarMapList): Expr<any> {
    switch(expr.tag) {
        case "call": {
            expr.args = expr.args.map((v) => rewriteExpr(v, funcList, varList));
            for(var i = funcList.length - 1; i >= 0 ; i -- ) {
                if(funcList[i].has(expr.name)) {
                    const fun = funcList[i].get(expr.name);
                    expr.name = fun.name;
                    fun.closure.forEach((v) => {
                        expr.args.push({tag: "name", name: v.name})
                    })
                    break;
                }
            }
            break;
        }
        case "binary": {
            expr.lhs = rewriteExpr(expr.lhs, funcList, varList);
            expr.rhs = rewriteExpr(expr.rhs, funcList, varList);
            break;
        } 
        case "name": {
            break;
        }
        case "literal": {
            break;
        }
        case "unary": {
            expr.expr = rewriteExpr(expr.expr, funcList, varList);
            break;
        } 
        case "getfield": {
            expr.obj = rewriteExpr(expr.obj, funcList, varList);
            break;
        }
        case "method": {
            expr.obj = rewriteExpr(expr.obj, funcList, varList);
            expr.args = expr.args.map((v) => rewriteExpr(v, funcList, varList));
            break;
        } 
        case "array": {
            expr.eles = expr.eles.map(e => rewriteExpr(e, funcList, varList));
            break;
        }
        case "index": {
            expr.obj = rewriteExpr(expr.obj, funcList, varList);
            expr.idx = rewriteExpr(expr.idx, funcList, varList);
            break;
        }
        default: {
            throw new Error(`Unsupported expr type:`);
        }
    }
    return expr;
}



function rewriteStmts(stmts: Stmt<any>[], currentPrefix: string, funcList: FuncMapList, varList: VarMapList, funcs: FuncStmt<any>[]): Stmt<any>[]{
    const newStmts: Stmt<any>[] = [];
    stmts.forEach((s) => {
        switch (s.tag) {
            case "func": {
                funcs.push(s);
                // enter new env
                funcList.push(new Map<string, Func>());
                varList.push(new Map<string, Var>());

                // define var
                s.params.forEach((p) => {
                    varList[varList.length - 1].set(p.name, {name: p.name, type: p.type, scope: ""});
                });

                s.body.forEach((p) => {
                    if (p.tag === "var") {
                        varList[varList.length - 1].set(p.var.name, {name: p.var.name, type: p.var.type, scope: ""});
                    }
                })

                // compute closure
                const closure: Var[] = [];
                const names: Set<string> = new Set<string>();

                // get all names used in the body
                getStmtsVarName(s.body, names);

                // add to closure if not defined locally
                names.forEach(name => {
                    for (var i = varList.length - 1; i >= 0 ; i --) {
                        if (varList[i].has(name)) {
                            if (i !== varList.length - 1 && i !== 0) {
                                // only add non local variable
                                closure.push(varList[i].get(name));
                            }
                            break;
                        }
                    }
                })

                // add closure to func param
                closure.forEach(v => {
                    s.params.push({name: v.name, type: v.type});
                });


                funcList[funcList.length - 2].set(s.name, {name: currentPrefix + s.name, closure});

                // change name
                s.name = currentPrefix + s.name;

                // add args to func call
                s.body = rewriteStmts(s.body, s.name + "$", funcList, varList, funcs);
                
                // exit env
                funcList.pop();
                varList.pop();
                break;
            } case  "class": {
                newStmts.push(s);
                
                // enter new env
                funcList.push(new Map<string, Func>());
                
                s.methods.forEach((m) => m.body = rewriteStmts(m.body, currentPrefix + s.name + "$" + m.name + "$", funcList, varList, funcs));
                
                // exit env
                funcList.pop();
                break;
            } case "assign": {
                newStmts.push(s);
                s.value = rewriteExpr(s.value, funcList, varList);
                break;
            } case "expr": {
                newStmts.push(s);
                s.expr = rewriteExpr(s.expr, funcList, varList);
                break;
            } case "if": {
                newStmts.push(s);
                s.if.cond = rewriteExpr(s.if.cond, funcList, varList);
                s.if.body = rewriteStmts(s.if.body, currentPrefix, funcList, varList, funcs);
                s.elif = s.elif.map((e) => {
                    e.cond = rewriteExpr(e.cond, funcList, varList);
                    e.body = rewriteStmts(e.body, currentPrefix, funcList, varList, funcs);
                    return e;
                });
                s.else = rewriteStmts(s.else, currentPrefix, funcList, varList, funcs);
                break;
            } case "while": {
                newStmts.push(s);
                s.while.body = rewriteStmts(s.while.body, currentPrefix, funcList, varList, funcs);
                s.while.cond = rewriteExpr(s.while.cond, funcList, varList);
                break;
            } case "pass": {
                newStmts.push(s);
                break;
            } case "return": {
                newStmts.push(s);
                s.value = rewriteExpr(s.value, funcList, varList);
                break;
            } case "var": {
                newStmts.push(s);
                break;
            } case "scope": {
                newStmts.push(s);
                // DSC TODO
                break;
            } default: {
                throw new Error(`Unsupported stmt type:`);
            }
        }
    })
    return newStmts;
}


export function functionLifting(stmts: Stmt<any>[], funs: FuncStmt<any>[]): Stmt<any>[]{
    const funcList: FuncMapList = [];
    const varList: VarMapList = [];
    funcList.push(new Map<string, Func>());
    varList.push(new Map<string, Var>());

    // define global variables
    stmts.forEach((p) => {
        if (p.tag === "var") {
            varList[varList.length - 1].set(p.var.name, {name: p.var.name, type: p.var.type, scope: ""});
        }
    })


    const newStmts = rewriteStmts(stmts, "", funcList, varList, funs);
    return newStmts;
}