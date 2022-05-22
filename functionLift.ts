import { Stmt, Expr, Type, FuncStmt, VarStmt, ClassStmt, typeStr, Literal, buildClassType, LValue, isClass, NameExpr } from './ast';
import { SearchScope, Scope, Env } from "./tc";

type Func = {name: string};
type Var = {name: string, type: Type, isRead: boolean};
type VarMap = Map<string, Var>;
type ClosureMap = Map<string, VarMap>;
type FreeVarMap = Map<string, VarMap>;

function getExprVarName(expr: Expr<any>, names: Map<string, boolean>) {
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
            if (names.has(expr.name)) {
                names.set(expr.name, true && names.get(expr.name));
            } else {
                names.set(expr.name, true);
            }
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



function getStmtsVarName(stmts: Stmt<any>[], names: Map<string, boolean>) {
    stmts.forEach((stmt) => {
        switch (stmt.tag) {
            case "assign": {
                getExprVarName(stmt.name, names);
                getExprVarName(stmt.value, names);
                if (stmt.name.tag === "name") {
                    // modify a variable here, could be nonlocal
                    names.set(stmt.name.name, false);
                }
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
            } case "for": {
                getExprVarName(stmt.loopVar, names);
                getExprVarName(stmt.iter, names);
                getStmtsVarName(stmt.body, names);
            } case "func": {
                break;
            } case "scope": {
                break;
            } default: {
                throw new Error(`Unsupported stmt type:`);
            }
        }
    });
}

// rewrite 
function rewriteExpr(expr: Expr<any>, currentFuncName: string, funcEnv: Env<Func>, varEnv: Env<Var>, closureMap: ClosureMap, freeVarMap: FreeVarMap): Expr<any> {
    switch(expr.tag) {
        case "call": {
            expr.args = expr.args.map((v) => rewriteExpr(v, currentFuncName, funcEnv, varEnv, closureMap, freeVarMap));
            const [found, symbol] = funcEnv.lookUpSymbol(expr.name, SearchScope.ALL);
            if (found) {
                expr.name = symbol.name;
                closureMap.get(symbol.name).forEach((v) => {
                    expr.args.push({tag: "name", name: v.name})
                });
            }
            break;
        }
        case "binary": {
            expr.lhs = rewriteExpr(expr.lhs, currentFuncName, funcEnv, varEnv, closureMap, freeVarMap);
            expr.rhs = rewriteExpr(expr.rhs, currentFuncName, funcEnv, varEnv, closureMap, freeVarMap);
            break;
        } 
        case "name": {
            // TODO:
            // if(isClass(expr.a) && expr.a.name.endsWith("$ref")) break;
            if ( freeVarMap.has(currentFuncName) ) {
                // not a global scope
                const currentFreeVar = freeVarMap.get(currentFuncName);
                if (currentFreeVar.has(expr.name) && !currentFreeVar.get(expr.name).isRead) {
                    // a -> a.x
                    const currentType = currentFreeVar.get(expr.name).type;
                    return {a: currentType, tag: "getfield", obj: {...expr, a: buildClassType(typeStr(currentType) + "$ref")}, name: "x"};
                }
            } 
            if (closureMap.has(currentFuncName)) {
                // not a global scope
                const currentClosure = closureMap.get(currentFuncName);
                if (currentClosure.has(expr.name) && !currentClosure.get(expr.name).isRead) {
                    // a -> a.x
                    const currentType = currentClosure.get(expr.name).type;
                    return {a: currentType, tag: "getfield", obj: {...expr, a: buildClassType(typeStr(currentType) + "$ref")}, name: "x"};
                }
            }
            break;
        }
        case "literal": {
            break;
        }
        case "unary": {
            expr.expr = rewriteExpr(expr.expr, currentFuncName, funcEnv, varEnv, closureMap, freeVarMap);
            break;
        } 
        case "getfield": {
            expr.obj = rewriteExpr(expr.obj, currentFuncName, funcEnv, varEnv, closureMap, freeVarMap);
            break;
        }
        case "method": {
            expr.obj = rewriteExpr(expr.obj, currentFuncName, funcEnv, varEnv, closureMap, freeVarMap);
            expr.args = expr.args.map((v) => rewriteExpr(v, currentFuncName, funcEnv, varEnv, closureMap, freeVarMap));
            break;
        } 
        case "array": {
            expr.eles = expr.eles.map(e => rewriteExpr(e, currentFuncName, funcEnv, varEnv, closureMap, freeVarMap));
            break;
        }
        case "index": {
            expr.obj = rewriteExpr(expr.obj, currentFuncName, funcEnv, varEnv, closureMap, freeVarMap);
            expr.idx = rewriteExpr(expr.idx, currentFuncName, funcEnv, varEnv, closureMap, freeVarMap);
            break;
        }
        default: {
            throw new Error(`Unsupported expr type:`);
        }
    }
    return expr;
}


function constructInit(type: Type): Literal {
    if (type.tag === "int") return 0;
    else if (type.tag === "bool") return true;
    else {
        return "None";
    }
}


function constructRefClass(type: Type): ClassStmt<any> {
    // { a?: A, tag: "class", name: string, super: string, methods: FuncStmt<A>[], fields: VarStmt<A>[]}
    const field: VarStmt<any> = {tag: "var", var: {name: "x", type}, value: {tag: "literal", value: constructInit(type)}};
    const initFunc: FuncStmt<any> =  {
        tag: "func", 
        name: "__init__", 
        params: [{name: "self", type: buildClassType(typeStr(type) + "$ref")}],
        ret: buildClassType(typeStr(type) + "$ref"),
        body: []
    }

    const s: ClassStmt<any> = {
        tag: "class", 
        name: typeStr(type) + "$ref", 
        super: "object", 
        fields: [field], 
        methods: [initFunc]
    };
    return s;
}


function rewriteStmts(stmts: Stmt<any>[], currentFuncName: string, funcEnv: Env<Func>, varEnv: Env<Var>, closureMap: ClosureMap, freeVarMap: FreeVarMap, funs: FuncStmt<any>[], cls: ClassStmt<any>[]): Stmt<any>[] {
    let newStmts: Stmt<any>[] = [];
    stmts.forEach((s) => {
        switch (s.tag) {
            case "func": {
                funs.push(s);
                funcEnv.defineNewSymbol(s.name, {name: computeCurrentFuncName(currentFuncName, s.name)});
                s.name = computeCurrentFuncName(currentFuncName, s.name);
                funcEnv.addScope();


                // add args to func call
                s.body = rewriteStmts(s.body, s.name, funcEnv, varEnv, closureMap, freeVarMap, funs, cls);


                // wrap ref around freeVars definition
                const newBody: Stmt<any>[] = []
                if (freeVarMap.has(s.name)) {
                    // wrap param as ref
                    const currentFreeVar = freeVarMap.get(s.name);
                    s.params.forEach(p => {
                        if (currentFreeVar.has(p.name) && !currentFreeVar.get(p.name).isRead) {
                            if (!cls.some(c=>c.name === typeStr(p.type) + "$ref")) {
                                cls.push(constructRefClass(p.type));
                            }
                            const newPName = p.name + "$ref";
                            const newType = buildClassType(typeStr(p.type) + "$ref");
                            newBody.push({tag: "var", var: {name: p.name, type: newType}, value: {a: {tag: "none"}, tag: "literal", value: "None"}});
                            newBody.push({tag: "assign", name: {a: newType, tag: "name", name: p.name}, value: {a: newType, tag: "call", name: newType.name, args: []}});
                            newBody.push({tag: "assign", name: {a: p.type, tag: "getfield", obj: {a: newType, tag: "name", name: p.name}, name: "x"}, value: {a: p.type, tag: "name", name: newPName}});
                            p.name = newPName;
                        }
                    });


                    // add closure to func param
                    const currentClosure = closureMap.get(s.name);
                    currentClosure.forEach(v => {
                        if (!v.isRead) {
                            s.params.push({name: v.name, type: buildClassType(typeStr(v.type) + "$ref")});
                        } else {
                            s.params.push({name: v.name, type: v.type});
                        }
                    });


                    s.body.forEach(v => {
                        // wrap local as ref
                        if (v.tag === "var" && currentFreeVar.has(v.var.name) && !currentFreeVar.get(v.var.name).isRead) {
                            if (!cls.some(c=>c.name === typeStr(v.var.type) + "$ref")) {
                                cls.push(constructRefClass(v.var.type));
                            }

                            const newType = buildClassType(typeStr(v.var.type) + "$ref");
                            newBody.push({tag: "var", var: {name: v.var.name, type: newType}, value: {a: {tag: "none"}, tag: "literal", value: "None"}});
                            newBody.push({tag: "assign", name: {a: newType, tag: "name", name: v.var.name}, value: {a: newType, tag: "call", name: newType.name, args: []}})
                            newBody.push({tag: "assign", name: {a: v.var.type, tag: "getfield", obj: {a: newType, tag: "name", name: v.var.name}, name: "x"}, value: v.value});
                                
                        } else {
                            newBody.push(v);
                        }
                    })
                }


                s.body = newBody;
                // exit env
                funcEnv.removeScope();
                break;
            } case  "class": {
                // enter new env
                funcEnv.addScope();
                s.methods.forEach((m) => m.body = rewriteStmts(m.body, computeCurrentFuncName(computeCurrentFuncName(currentFuncName, s.name), m.name), funcEnv, varEnv, closureMap, freeVarMap, funs, cls));
                // exit env
                funcEnv.removeScope();
                break;
            } case "assign": {
                s.name = rewriteExpr(s.name, currentFuncName, funcEnv, varEnv, closureMap, freeVarMap) as LValue<any>;
                s.value = rewriteExpr(s.value, currentFuncName, funcEnv, varEnv, closureMap, freeVarMap);
                break;
            } case "expr": {
                s.expr = rewriteExpr(s.expr, currentFuncName, funcEnv, varEnv, closureMap, freeVarMap);
                break;
            } case "if": {
                s.if.cond = rewriteExpr(s.if.cond, currentFuncName, funcEnv, varEnv, closureMap, freeVarMap);
                s.if.body = rewriteStmts(s.if.body, currentFuncName, funcEnv, varEnv, closureMap, freeVarMap, funs, cls);
                s.elif = s.elif.map((e) => {
                    e.cond = rewriteExpr(e.cond, currentFuncName, funcEnv, varEnv, closureMap, freeVarMap);
                    e.body = rewriteStmts(e.body, currentFuncName, funcEnv, varEnv, closureMap, freeVarMap, funs, cls);
                    return e;
                });
                s.else = rewriteStmts(s.else, currentFuncName, funcEnv, varEnv, closureMap, freeVarMap, funs, cls);
                break;
            } case "while": {
                s.while.body = rewriteStmts(s.while.body, currentFuncName, funcEnv, varEnv, closureMap, freeVarMap, funs, cls);
                s.while.cond = rewriteExpr(s.while.cond, currentFuncName, funcEnv, varEnv, closureMap, freeVarMap);
                break;
            } case "pass": {
                break;
            } case "return": {
                s.value = rewriteExpr(s.value, currentFuncName, funcEnv, varEnv, closureMap, freeVarMap);
                break;
            } case "var": {
                break;
            } case "scope": {
                // DSC TODO
                break;
            } case "for": {
                // TODO: use as keyword for quick fix
                s.loopVar = rewriteExpr(s.loopVar, currentFuncName, funcEnv, varEnv, closureMap, freeVarMap) as NameExpr<Type>;
                s.iter = rewriteExpr(s.iter, currentFuncName, funcEnv, varEnv, closureMap, freeVarMap);
                s.body = rewriteStmts(s.body, currentFuncName, funcEnv, varEnv, closureMap, freeVarMap, funs, cls);
                break;
            } default: {
                throw new Error(`Unsupported stmt type:`);
            }
        }
        if(s.tag !== "func") {
            newStmts.push(s);
        }
    })
    return newStmts;
}

function computeCurrentFuncName(prev: string, name: string) {
    if (prev.length === 0) return name;
    else {
        return prev + "$" + name;
    }
}


function computeClosureAndFreeVars(stmts: Stmt<any>[], currentFuncName: string, varEnv: Env<Var>, closureMap: ClosureMap, freeVarMap: FreeVarMap) {
    stmts.forEach((s) => {
        switch (s.tag) {
            case "func": {
                // enter new env
                varEnv.addScope();

                // define var
                s.params.forEach((p) => {
                    varEnv.defineNewSymbol(p.name, {name: p.name, type: p.type, isRead: true});
                });

                const funs: FuncStmt<any>[] = [];
                s.body.forEach((p) => {
                    if (p.tag === "var") {
                        varEnv.defineNewSymbol(p.var.name, {name: p.var.name, type: p.var.type, isRead: true});
                    } 
                    // else if (p.tag === "scope") {
                    //     const [_, symbol] = varEnv.lookUpSymbol(p.name, p.global? SearchScope.GLOBAL: SearchScope.NONLOCAL);
                    //     varEnv.defineNewSymbol(p.name, {name: p.name, type: symbol.type, scope: p.global? Scope.GLOBAL: Scope.NONLOCAL});
                    // } 
                    else if (p.tag === "func") {
                        funs.push(p);
                    }
                })

                // compute closure
                computeClosureAndFreeVars(s.body, computeCurrentFuncName(currentFuncName, s.name), varEnv, closureMap, freeVarMap);


                const closure: VarMap = new Map<string, Var>();
                const freeVar: VarMap = new Map<string, Var>();
                // a mapping from variable name to whether it is being written
                const closureNames: Map<string, boolean> = new Map<string, boolean>();
                const freeVarNames: Map<string, boolean> = new Map<string, boolean>();
                // get all names used in the body
                getStmtsVarName(s.body, closureNames);

                // merge closure here
                funs.forEach((f) => {
                    let innerFuncClosure = closureMap.get(computeCurrentFuncName(computeCurrentFuncName(currentFuncName, s.name), f.name));
                    innerFuncClosure.forEach(v => {
                        if (closureNames.has(v.name)) {
                            const isRead = closureNames.get(v.name);
                            closureNames.set(v.name, isRead && v.isRead);
                        } else {
                            closureNames.set(v.name, v.isRead);
                        }

                        if (freeVarNames.has(v.name)) {
                            const isRead = freeVarNames.get(v.name);
                            freeVarNames.set(v.name, isRead && v.isRead);
                        } else {
                            freeVarNames.set(v.name, v.isRead);
                        }

                    })
                })

                // add to closure if not defined locally
                closureNames.forEach((isRead, name) => {
                    let [found, symbol] = varEnv.lookUpSymbol(name, SearchScope.LOCAL);
                    if (!found) {
                        [found, symbol] = varEnv.lookUpSymbol(name, SearchScope.NONLOCAL);
                        if (found) {
                            symbol.isRead = isRead;
                            closure.set(name, symbol);
                        }
                    }
                })

                freeVarNames.forEach((isRead, name) => {
                    let [found, symbol] = varEnv.lookUpSymbol(name, SearchScope.LOCAL);
                    if (found) {
                        symbol.isRead = isRead;
                        freeVar.set(name, symbol);
                    }
                })
                // for every var with write, wrap it in ref type
                closureMap.set(computeCurrentFuncName(currentFuncName, s.name), closure);
                freeVarMap.set(computeCurrentFuncName(currentFuncName, s.name), freeVar);

                // exit env
                varEnv.removeScope();
                break;
            } case  "class": {
                s.methods.forEach((m) => computeClosureAndFreeVars(m.body, computeCurrentFuncName(computeCurrentFuncName(currentFuncName, s.name), m.name), varEnv, closureMap, freeVarMap));
                break;
            } case "if": {
                computeClosureAndFreeVars(s.if.body, currentFuncName, varEnv, closureMap, freeVarMap);
                s.elif = s.elif.map((e) => {
                    computeClosureAndFreeVars(e.body, currentFuncName, varEnv, closureMap, freeVarMap);
                    return e;
                });
                computeClosureAndFreeVars(s.else, currentFuncName, varEnv, closureMap, freeVarMap);
                break;
            } case "while": {
                computeClosureAndFreeVars(s.while.body, currentFuncName, varEnv, closureMap, freeVarMap);
                break;
            }
        }
    })
}

export function functionLifting(stmts: Stmt<any>[]): [Stmt<any>[], FuncStmt<any>[], ClassStmt<any>[]]{
    const funcEnv = new Env<Func>();
    const varEnv = new Env<Var>();
    const closureMap = new Map<string, VarMap>();
    const freeVarMap = new Map<string, VarMap>();

    // define global variables
    stmts.forEach((p) => {
        if (p.tag === "var") {
            varEnv.defineNewSymbol(p.var.name, {name: p.var.name, type: p.var.type, isRead: true});
        }
    })

    let funs: FuncStmt<any>[] = [];
    let cls: ClassStmt<any>[] = [];
    computeClosureAndFreeVars(stmts, "", varEnv, closureMap, freeVarMap);
    
    // console.log("closure:")
    // closureMap.forEach((v, k) => console.log(k, v));
    // console.log("freevar:")
    // freeVarMap.forEach((v, k) => console.log(k, v));
    let newStmts = rewriteStmts(stmts, "", funcEnv, varEnv, closureMap, freeVarMap, funs, cls);
    return [newStmts, funs, cls];
}