
import { assert } from "chai";
import { BinOp, Expr, Stmt, Type, UniOp, FuncStmt, VarStmt, isAssignable, isTypeEqual, typeStr } from "./ast";

type VarSymbol = {tag: "var", type: Type}
type FuncSymbol = {tag: "func", type: [Type[], Type]}
type ClassSymbol = {tag: "class", type: {super: string, methods: Map<string, [Type[], Type]>, fields: Map<string, Type>}}
type UnionSymbol = VarSymbol | FuncSymbol | ClassSymbol
type SymbolTable = Map<string, UnionSymbol>
type SymbolTableList = SymbolTable[];


function isSubClass(sub: Type, sup: Type, envList : SymbolTableList): boolean {
    if (sub.tag !== "class" || sup.tag !== "class") return false;
    else {
        const [_, symbolSub] = lookUpSymbol(envList, sub.name, false);
        if (symbolSub.tag !== "class" || symbolSub.type.super === "object") return false;
        else if (symbolSub.type.super === sup.name) return true;
        else {
            return isSubClass( {tag: "class", name: symbolSub.type.super} , sup, envList);
        }
    }
}


function getCurrentEnv(envList : SymbolTableList): SymbolTable {
    assert(envList.length > 0);
    return envList[envList.length - 1];
}


function enterNewEnv(envList : SymbolTableList): SymbolTableList {
    envList.push(new Map<string, UnionSymbol>());
    return envList;
}


function exitCurrentEnv(envList : SymbolTableList): SymbolTableList {
    envList.pop();
    return envList;
}

function lookUpSymbol(envList : SymbolTableList, name: string, current: boolean): [boolean, UnionSymbol] {
    var end = current? envList.length - 1: 0;
    for(var i = envList.length - 1; i >= end; i --) {
        if(envList[i].has(name)) return [true, envList[i].get(name)];
    }
    // throw new Error(`Reference error: variable ${name} is not defined`)
    return [false, undefined];
}


function defineNewSymbol(envList : SymbolTableList, name: string, type: UnionSymbol) {
    let [found, t] = lookUpSymbol(envList, name, true);
    if (found) {
        throw new Error("Redefine symbol: " + name);
    } else {
        getCurrentEnv(envList).set(name, type);
    }
}



export function didAllPathReturn(stmts: Stmt<any>[]): boolean {
    return stmts.some( s => (s.tag === "return") || (s.tag === "if") && didAllPathReturn(s.if.body) && didAllPathReturn(s.else) && (s.elif.every((e => didAllPathReturn(e.body)))));
}


export function tcExpr(e : Expr<any>, envList : SymbolTableList) : Expr<Type> {
    switch(e.tag) {
        case "literal":
            if( e.value === "None") {
                return { ...e, a: {tag: "none"}};
            } else if (e.value === true) {
                return { ...e, a: {tag: "bool"}}; 
            } else if (e.value === false) {
                return { ...e, a: {tag: "bool"}};
            } else {
                return { ...e, a: {tag: "int"}};
            }
        case "binary": {
            const lhs = tcExpr(e.lhs, envList);
            const rhs = tcExpr(e.rhs, envList);
            switch(e.op) {
                case BinOp.Plus: 
                case BinOp.Minus:
                case BinOp.Mul:
                case BinOp.Div: 
                case BinOp.Mod:
                    if (lhs.a.tag !== "int" || rhs.a.tag !== "int") {
                        throw new TypeError(`TYPE ERROR: Expected type INT but got type ${typeStr(lhs.a)} and type ${typeStr(rhs.a)}`)
                    }
                    return { ...e, a: {tag: "int"}, lhs, rhs};
                case BinOp.Equal:
                case BinOp.Unequal:
                    if (!isTypeEqual(lhs.a, rhs.a) || (lhs.a.tag !== "int" && lhs.a.tag !== "bool")) {
                        throw new TypeError(`TYPE ERROR: Expected lhs and rhs to be same type of INT or BOOL but got type ${typeStr(lhs.a)} and type ${typeStr(rhs.a)}`)
                    }
                    return { ...e, a: {tag: "bool"}, lhs, rhs};
                case BinOp.Gt: 
                case BinOp.Ge:
                case BinOp.Lt:
                case BinOp.Le:
                    if (lhs.a.tag !== "int" || rhs.a.tag !== "int") {
                        throw new TypeError(`TYPE ERROR: Expected type INT but got type ${typeStr(lhs.a)} and type ${typeStr(rhs.a)}`)
                    }
                    return { ...e, a: {tag: "bool"}, lhs, rhs };
                case BinOp.Is:
                    if (lhs.a.tag === "int" || rhs.a.tag === "int" || lhs.a.tag === "bool" || rhs.a.tag === "bool" ) {
                        throw new TypeError(`TYPE ERROR: Expected type NONE or CLASS but got type ${typeStr(lhs.a)} and type ${typeStr(rhs.a)}`)
                    }
                    return { ...e, a: {tag: "bool"}, lhs, rhs };
            }
        }

        case "unary": {
            const expr = tcExpr(e.expr, envList);
            switch(e.op) {
                case UniOp.Not: 
                    if (expr.a.tag !== "bool") {
                        throw new TypeError(`TYPE ERROR: Expected type BOOL but got type ${typeStr(expr.a)}`)
                    }
                    return { ...e, a: {tag: "bool"}, expr: expr };
                case UniOp.Neg: 
                    if (expr.a.tag !== "int") {
                        throw new TypeError(`TYPE ERROR: Expected type INT but got type ${typeStr(expr.a)}`)
                    }
                    return { ...e, a: {tag: "int"}, expr: expr };
            }
        }
        case "name": {
            let [found, t] = lookUpSymbol(envList, e.name, false);
            if (!found) {
                throw new ReferenceError(`Reference error: ${e.name} is not defined`)
            } 
            if (t.tag !== "var") {
                throw new ReferenceError(`Reference error: ${e.name} is not a variable`)
            }
            return { ...e, a: t.type};
        }
        case "call": {
            if(e.name === "print") {
                if(e.args.length !== 1) { throw new Error("print expects a single argument"); }
                const newArgs = [tcExpr(e.args[0], envList)];
                const res : Expr<Type> = { ...e, a: {tag: "none"}, args: newArgs } ;
                return res;
            }

            let [found, t] = lookUpSymbol(envList, e.name, false);
            if(!found) {
                throw new ReferenceError(`function ${e.name} is not defined`);
            }
            
            if(t.tag === "func" || t.tag === "var" && t.type.tag === "callable") {
                let args: Type[];
                let ret: Type;
                if (t.tag === "func") {
                    [args, ret] = t.type;
                } else {
                    const callableType = (t.type as {tag: "callable", params: Type[], ret: Type});
                    [args, ret] = [callableType.params, callableType.ret];
                }
                if(args.length !== e.args.length) {
                    throw new Error(`Expected ${args.length} arguments but got ${e.args.length}`);
                }

                const newArgs = args.map((a, i) => {
                    const argtyp = tcExpr(e.args[i], envList);
                    if(!isAssignable(a, argtyp.a) && !isSubClass(argtyp.a, a, envList)) { throw new TypeError(`TYPE ERROR: Got ${typeStr(argtyp.a)} as argument ${i + 1}, expected ${typeStr(a)}`); }
                    return argtyp
                });

                return { ...e, a: ret, args: newArgs };
            } else if (t.tag === "class") {
                // calling init function
                // init function should not call with any parameters
                if(0 !== e.args.length) {
                    throw new Error(`Expected ${0} arguments but got ${e.args.length}`);
                }
                return { ...e, a: {tag: "class", name: e.name} };
            } else {
                throw new ReferenceError(`${e.name} is not a function or class or callable`);
            }
        }
        case "getfield": {
            const newObj = tcExpr(e.obj, envList);
            if (newObj.a.tag !== "class") {
                throw new Error("can not get member of non-class")
            } 
            let classType = newObj.a;
            let [found, symbol] = lookUpSymbol(envList, classType.name, false);
            if(!found) {
                throw new ReferenceError(`class ${classType.name} is not defined`);
            }
            if(symbol.tag !== "class") {
                throw new ReferenceError(`${classType.name} is not a class name`);
            }

            let className = classType.name;
            let classData = symbol.type;
            while (className !== "object") {
                if (!classData.fields.has(e.name)) {
                    className = classData.super;
                    classData = (lookUpSymbol(envList, className, false)[1] as ClassSymbol).type;
                } else {
                    break;
                }
            }

            if (className === "object") {
                // can not find field in class or any super class
                throw new ReferenceError(`class ${classType.name} does not have field ${e.name}`)
            }

            return { ...e, a: classData.fields.get(e.name), obj: newObj };
        }
        case "method": {
            const newObj = tcExpr(e.obj, envList);
            if (newObj.a.tag !== "class") {
                throw new Error("can not call method on non-class")
            }
            let classType = newObj.a;
            let [found, symbol] = lookUpSymbol(envList, classType.name, false);
            if(!found) {
                throw new ReferenceError(`class ${classType.name} is not defined`);
            }
            if(symbol.tag !== "class") {
                throw new ReferenceError(`${classType.name} is not a class name`);
            }

            let className = classType.name;
            let classData = symbol.type;
            // track all the super class
            while (className !== "object") {
                if (!classData.methods.has(e.name) 
                    && (!classData.fields.has(e.name) || classData.fields.get(e.name).tag !== "callable")) {
                    className = classData.super;
                    classData = (lookUpSymbol(envList, className, false)[1] as ClassSymbol).type;
                } else {
                    break;
                }
            }
            
            if (className === "object") {
                throw new ReferenceError(`class ${classType.name} does not have method ${e.name} or callable field ${e.name}`)
            }

            // should be able to function pointers too
            let args: Type[];
            let ret: Type;
            let isClassMethod: number;
            if (classData.methods.has(e.name)) {
                isClassMethod = 1;
                [args, ret] = classData.methods.get(e.name);
            } else {
                isClassMethod = 0;
                const callableType = (classData.fields.get(e.name) as {tag: "callable", params: Type[], ret: Type});
                [args, ret] = [callableType.params, callableType.ret];
            }

            if(args.length !== e.args.length + isClassMethod) {
                throw new Error(`Expected ${args.length} arguments but got ${e.args.length + isClassMethod}`);
            }
            
            // exclude self
            const newArgs = args.slice(isClassMethod).map((a, i) => {
                const argtyp = tcExpr(e.args[i], envList);
                if(!isAssignable(a, argtyp.a) && !isSubClass(argtyp.a, a, envList)) { throw new TypeError(`TYPE ERROR: Got ${typeStr(argtyp.a)} as argument ${i + isClassMethod}, expected ${typeStr(a)}`); }
                return argtyp;
            });
            return { ...e, a: ret, obj: newObj, args: newArgs };
        }
    }
}

export function tcFuncStmt(s : FuncStmt<any>, envList: SymbolTableList, currentReturn : Type) : FuncStmt<Type> {
    if (s.ret.tag !== "none" && !didAllPathReturn(s.body)) {
        throw new TypeError(`TYPE ERROR: All path in function ${s.name} must have a return statement`);
    }
    envList = enterNewEnv(envList);

    // define param
    s.params.forEach(p => defineNewSymbol(envList, p.name, {tag: "var", type: p.type}));

    // define local variables and functions
    s.body.forEach(s => {
        if (s.tag === "func") defineNewSymbol(envList, s.name, {tag: "func", type: [s.params.map(p => p.type), s.ret]});
        else if (s.tag === "var") defineNewSymbol(envList, s.var.name, {tag: "var", type: s.var.type});
    })

    checkDefinition(s.body);
    const newBody = s.body.map(bs => tcStmt(bs, envList, s.ret));
    
    exitCurrentEnv(envList);
    return { ...s, body: newBody };
}


export function tcVarStmt(s : VarStmt<any>, envList: SymbolTableList, currentReturn : Type) : VarStmt<Type> {
    const rhs = tcExpr(s.value, envList);
    if ( rhs.tag !== "literal") {
        throw new Error(`can only initialize variable with literal`);
    }
    if (!isAssignable(s.var.type, rhs.a)) {
        throw new TypeError(`TYPE ERROR: Incompatible type when initializing variable ${s.var.name} of type ${typeStr(s.var.type)} using type ${typeStr(rhs.a)}`)
    }
    return { ...s, value: rhs };
}


export function tcStmt(s : Stmt<any>, envList: SymbolTableList, currentReturn : Type) : Stmt<Type> {
    switch(s.tag) {
        case "func": {
            return tcFuncStmt(s, envList, currentReturn);
        }

        case "var": {
            return tcVarStmt(s, envList, currentReturn);
        }

        case "class": {
            // TODO: check if redefine class or method or field!
            // TODO: add super class fields into this
            const [found, superClassSymbol] = lookUpSymbol(envList, s.super, false);
            if (!found || superClassSymbol.tag !== "class") {
                throw new TypeError(`Class ${s.super} is not defined`)
            }

            let className = s.super;
            let classData = superClassSymbol.type;
            // track all the super class
            while (className !== "object") {
                if (!s.fields.some((f)=>classData.fields.has(f.var.name))) {
                    className = classData.super;
                    classData = (lookUpSymbol(envList, className, false)[1] as ClassSymbol).type;
                } else {
                    throw new TypeError(`TYPE ERROR: Redefine field in class ${s.name}`);
                }
            }

            let fields = s.fields.map((v)=>tcVarStmt(v, envList, currentReturn)); //TODO: pass class info
            let methods = s.methods.map((v)=>tcFuncStmt(v, envList, currentReturn));
            methods.forEach((m)=>{
                if (m.name === "__init__") {
                    if (m.params.length !== 1 || m.params[0].name !== "self" || m.ret.tag !== "none") {
                        throw new TypeError("TYPE ERROR: define __init__ with different signature");
                    }
                    // Change its return type here so it does not break the type check rule
                    // class A(object):
                    //     def __init__(self: A):
                    //         pass
                    // a: A = None
                    // a = A() # break here since A() calls __init__ which does not return anything
                    m.ret = {tag: "class", name: s.name};
                }
            })

            if (!methods.some((m)=> m.name === "__init__")) {
                const initFunc = {
                    tag: "func", 
                    name: "__init__", 
                    params: [{name: "self", type: {tag: "class", name: s.name}}],
                    ret: {tag: "class", name: s.name},
                    body: []
                } as FuncStmt<any>;
                methods = [initFunc].concat(methods);
            }
            return {
                ...s,
                fields,
                methods
            }
        }

        case "assign": {
            const rhs = tcExpr(s.value, envList);
            const lhs = tcExpr(s.name, envList);
            if (lhs.tag === "name") {
                const [found, t] = lookUpSymbol(envList, lhs.name, true);
                if (!found) {
                    throw new ReferenceError(`Reference error: ${lhs.name} is not defined`);
                }
            }
            if( !isAssignable(lhs.a, rhs.a) && !isSubClass(rhs.a, lhs.a, envList)) {
                throw new TypeError(`TYPE ERROR: Cannot assign ${typeStr(rhs.a)} to ${typeStr(lhs.a)}`);
            }
            
            return { ...s, name: lhs, value: rhs };
        }

        case "if": {
            const newIfCond = tcExpr(s.if.cond, envList);
            if(newIfCond.a.tag !== "bool") {
                throw new TypeError("TYPE ERROR: Expect type BOOL in condition")
            }
            // functions = enterNewFunctionScope(functions);
            // variables = enterNewVariableScope(variables);
            const newIfBody = s.if.body.map(bs => tcStmt(bs, envList, currentReturn));

            // exitCurrentFunctionScope(functions);
            // exitCurrentVariableScope(variables);

            const newElif = s.elif.map(bs => {
                let cond = tcExpr(bs.cond, envList);
                if(cond.a.tag !== "bool") {
                    throw new TypeError("TYPE ERROR: Expect type BOOL in condition")
                }
                // functions = enterNewFunctionScope(functions);
                // variables = enterNewVariableScope(variables);

                let body = bs.body.map(bb => tcStmt(bb, envList, currentReturn))

                // exitCurrentFunctionScope(functions);
                // exitCurrentVariableScope(variables);
                return {
                    cond: cond, 
                    body: body
                }});
            
            // functions = enterNewFunctionScope(functions);
            // variables = enterNewVariableScope(variables);
            
            const newElseBody = s.else.map(bs => tcStmt(bs, envList, currentReturn));

            // exitCurrentFunctionScope(functions);
            // exitCurrentVariableScope(variables);

            return {...s, if: {cond: newIfCond, body: newIfBody}, elif: newElif, else: newElseBody}
        }

        case "while": {
            const newCond = tcExpr(s.while.cond, envList);
            if(newCond.a.tag !== "bool") {
                throw new TypeError("TYPE ERROR: Expect type BOOL in condition")
            }
            // functions = enterNewFunctionScope(functions);
            // variables = enterNewVariableScope(variables);

            const newBody = s.while.body.map(bs => tcStmt(bs, envList, currentReturn));

            // exitCurrentFunctionScope(functions);
            // exitCurrentVariableScope(variables);
            return { ...s, while: {cond: newCond, body: newBody}};
        }

        case "pass": {
            return s;
        }
        case "expr": {
            const ret = tcExpr(s.expr, envList);
            return { ...s, expr: ret };
        }
        case "return": {
            const valTyp = tcExpr(s.value, envList);
            if(!isAssignable(currentReturn, valTyp.a) && !isSubClass(valTyp.a, currentReturn, envList)) {
                throw new TypeError(`TYPE ERROR: ${typeStr(valTyp.a)} returned but ${typeStr(currentReturn)} expected.`);
            }
            return { ...s, value: valTyp };
        }
    }
}

export function checkDefinition(p : Stmt<any>[]) {
    var LastDeclare = -1;
    var firstStmt = p.length;
    for(var i = 0; i < p.length; i ++) {
        if (p[i].tag === "var" || p[i].tag === "func" || p[i].tag === "class") {
            LastDeclare = i;
        } else {
            firstStmt = i;
        }

        if (LastDeclare > firstStmt) {
            throw new Error("Can not define variable and func after")
        }
    }
}


export function tcProgram(p : Stmt<any>[]) : Stmt<Type>[] {
    var envList: SymbolTableList = [];

    envList = enterNewEnv(envList);
    
    // check if all definition are proceeding statements
    checkDefinition(p);
    // define all the functions and variables
    defineNewSymbol(envList, "object", {tag: "class", type: {super: "", methods: new Map<string, [Type[], Type]>(), fields: new Map<string, Type>()}});
    p.forEach(s => {
        if (s.tag === "func") {
            defineNewSymbol(envList, s.name, {tag: "func", type: [s.params.map(p => p.type), s.ret]});
        }
        else if (s.tag === "var") {
            defineNewSymbol(envList, s.var.name, {tag: "var", type: s.var.type});
        }
        else if (s.tag === "class") {
            const methods = new Map<string, [Type[], Type]>();
            const fields = new Map<string, Type>();
            s.methods.forEach(m => {
                methods.set(m.name, [m.params.map((p)=>p.type), m.ret])
            })

            s.fields.forEach(m => {
                fields.set(m.var.name, m.var.type)
            })
            defineNewSymbol(envList, s.name, { tag: "class", type: { super: s.super, methods, fields }});
            }
    })

    return p.map(s => {
        const res = tcStmt(s, envList, {tag: "none"});
        return res;
    });
}