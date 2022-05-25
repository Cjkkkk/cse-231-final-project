import { BinOp, Expr, Stmt, Type, UniOp, FuncStmt, VarStmt, isAssignable, LValue, NameExpr, buildClassType } from "./ast";
import { isTypeEqual, typeStr, isClass, isIterable, isIndexable } from "./ast";
import { TypeError } from "./error"

type VarSymbol = {tag: "var", type: Type, scope: Scope}
type FuncSymbol = {tag: "func", type: [Type[], Type]}
type ClassSymbol = {tag: "class", type: {super: string, methods: Map<string, [Type[], Type]>, fields: Map<string, Type>}}
type UnionSymbol = VarSymbol | FuncSymbol | ClassSymbol
// type SymbolTable = Map<string, UnionSymbol>
type SymbolTableList = Env<UnionSymbol>
// type SymbolTableList = SymbolTable[];
export enum Scope {
    LOCAL,
    NONLOCAL,
    GLOBAL
};

export enum SearchScope {
    LOCAL = -1, 
    GLOBAL = 0,
    NONLOCAL = 1,
    LOCAL_AND_GLOBAL = 2,
    ALL = 3
};


function isSubClass(sub: Type, sup: Type, envList : SymbolTableList): boolean {
    if (sub.tag !== "class" || sup.tag !== "class") return false;
    else {
        const [_, symbolSub] = envList.lookUpSymbol(sub.name, SearchScope.GLOBAL);
        if (symbolSub.tag !== "class" || symbolSub.type.super === "object") return false;
        else if (symbolSub.type.super === sup.name) return true;
        else {
            return isSubClass( {tag: "class", name: symbolSub.type.super} , sup, envList);
        }
    }
}

export class Env<T> {
    decls: Map<string, T | undefined>[];
    constructor() {
        this.decls = [];
        this.addScope();
    }

    addScope() {
        this.decls.push(new Map<string, T>());
    }

    removeScope() {
        return this.decls.pop();
    }

    getCurScope() {
        return this.decls[this.decls.length - 1];
    }

    addDecl(id: string, value: T | undefined) {
        this.getCurScope().set(id, value);
    }
    
    defineNewSymbol(name: string, type: T) {
        let [found, t] = this.lookUpSymbol(name, SearchScope.LOCAL);
        if (found) {
            throw new Error("Redefine symbol: " + name);
        } else {
            this.addDecl(name, type);
        }
    }


    lookUpSymbol(id: string, scope: SearchScope): [boolean, T | undefined] {
        // scope: 1 - search all scopes except the last one and the first one (nonlocal)
        //        0 - search globally (only the global vars)
        //       -1 - search locally (only the last scope, current scope)
        // return: True - found, Type: type for id
        //         False - not found, Type: "none"
        let start: number = this.decls.length - 1;
        let end: number = 0;
        if (scope === SearchScope.GLOBAL)
            start = 0;
        else if (scope === SearchScope.LOCAL)
            end = this.decls.length - 1;
        else if (scope === SearchScope.NONLOCAL) { // NONLOCAL
            if (this.decls.length < 3) {
                return [false, undefined];
            }
            start = this.decls.length - 2;
            end = 1;
        } 
        else if (scope === SearchScope.LOCAL_AND_GLOBAL) {
            if (this.decls[0].has(id))
                return [true, this.decls[0].get(id)];
            if (this.decls[start].has(id))
                return [true, this.decls[start].get(id)];
            return [false, undefined];
        }
        for (let i = start; i >= end; i--) {
            if (this.decls[i].has(id))
                return [true, this.decls[i].get(id)];
        }
        return [false, undefined];
    }
}


export function didAllPathReturn(stmts: Stmt<any>[]): boolean {
    return stmts.some( s => (s.tag === "return") || (s.tag === "if") && didAllPathReturn(s.if.body) && didAllPathReturn(s.else) && (s.elif.every((e => didAllPathReturn(e.body)))));
}

export function tcNameExpr(e: NameExpr<any>, envList: SymbolTableList): NameExpr<Type> {
    let [found, t] = envList.lookUpSymbol(e.name, SearchScope.ALL);
    if (!found) {
        throw new ReferenceError(`Reference error: ${e.name} is not defined`)
    }
    if (t.tag !== "var") {
        throw new ReferenceError(`Reference error: ${e.name} is not a variable`)
    }
    return { ...e, a: t.type };
}

export function tcExpr(e: Expr<any>, envList: SymbolTableList) : Expr<Type> {
    switch(e.tag) {
        case "literal":
            if( e.value === "None") {
                return { ...e, a: {tag: "none"}};
            } else if (e.value === true) {
                return { ...e, a: {tag: "bool"}}; 
            } else if (e.value === false) {
                return { ...e, a: {tag: "bool"}};
            } else if (typeof(e.value) === 'string') {
                return { ...e, a: {tag: "string"}};
            } else{
                return { ...e, a: {tag: "int"}};
            }
        case "binary": {
            const lhs = tcExpr(e.lhs, envList);
            const rhs = tcExpr(e.rhs, envList);
            switch(e.op) {
                case BinOp.Plus: 
                    if (lhs.a.tag === "list" || rhs.a.tag === "list") {
                        if (!isTypeEqual(lhs.a, rhs.a)) {
                            throw new TypeError(`Try to concat two lists on type ${typeStr(lhs.a)} and type ${typeStr(rhs.a)}`);
                        }
                        return { ...e, a: lhs.a, lhs, rhs };
                    }
                    if (lhs.a.tag === "string" || rhs.a.tag === "string") {
                        if (!isTypeEqual(lhs.a, rhs.a)) {
                            throw new TypeError(`TYPE ERROR: Cannot apply operator \`+\` on types \`${typeStr(lhs.a)}\` and \`${typeStr(rhs.a)}\``);
                        }
                        return { ...e, a: lhs.a, lhs, rhs };
                    }
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
                    if (!isTypeEqual(lhs.a, rhs.a) || (lhs.a.tag !== "int" && lhs.a.tag !== "bool" && lhs.a.tag !== "string")) {
                        throw new TypeError(`TYPE ERROR: Expected lhs and rhs to be same type of INT or BOOL or STRING but got type ${typeStr(lhs.a)} and type ${typeStr(rhs.a)}`)
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
            return tcNameExpr(e, envList);
        }
        case "call": {
            if(e.name === "print") {
                if(e.args.length !== 1) { throw new Error("print expects a single argument"); }
                const newArgs = [tcExpr(e.args[0], envList)];
                const res : Expr<Type> = { ...e, a: {tag: "none"}, args: newArgs } ;
                return res;
            }
            else if (e.name === "len") {
                if (e.args.length !== 1) { throw new Error("len expects a single argument"); }
                const newArgs = tcExpr(e.args[0], envList);
                if (newArgs.a.tag !== "list" && newArgs.a.tag !== "string") {
                    // DSC TODO: Chocopy do not type check this argument?
                    throw new TypeError(`Cannot call len on type ${typeStr(newArgs.a)}`);
                }
                const res: Expr<Type> = { ...e, a: { tag: "int" }, args: [newArgs] };
                return res;
            }

            let [found, t] = envList.lookUpSymbol(e.name, SearchScope.ALL);
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
            let [found, symbol] = envList.lookUpSymbol(classType.name, 0);
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
                    classData = (envList.lookUpSymbol(className, SearchScope.GLOBAL)[1] as ClassSymbol).type;
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
            let [found, symbol] = envList.lookUpSymbol(classType.name, SearchScope.GLOBAL);
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
                    classData = (envList.lookUpSymbol(className, SearchScope.GLOBAL)[1] as ClassSymbol).type;
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
        case "array": {
            const newEles = e.eles.map(ele => tcExpr(ele, envList));
            var typ: Type;
            if (newEles.length === 0) {
                typ = { tag: "list", type: null };
            } else {
                let generalType = newEles[0].a;
                newEles.forEach(ele => {
                    let curType = ele.a;
                    if (!isTypeEqual(curType, generalType)) {
                        if (isSubClass(generalType, curType, envList)) {
                            generalType = curType;
                        } else if (generalType.tag === "none" && isClass(curType)) {
                            generalType = curType;
                        } else if (!(curType.tag === "none" && isClass(generalType)) && 
                            !isSubClass(curType, generalType, envList)) {
                            // throw new TypeError("Types in the list not uniform")
                            generalType = { tag: "class", name: "object" } 
                        }
                    }
                })
                // if (!newEles.every(ele => isAssignable(ele.a, newEles[0].a) || isAssignable(newEles[0].a, ele.a))) {
                //     throw new TypeError("Types in the list not uniform")
                // }
                typ = { tag: "list", type: generalType }
            }
            
            return { ...e, a: typ, eles: newEles }
        } 
        case "index": {
            const newObj = tcExpr(e.obj, envList);
            if (!isIndexable(newObj.a)) {
                throw new TypeError(`Cannot index into type ${typeStr(newObj.a)}`)
            }
            const newIdx = tcExpr(e.idx, envList);
            if (newIdx.a.tag !== "int") {
                throw new TypeError(`Index is of non-integer type ${typeStr(newIdx.a)}`)
            }
            if (newObj.a.tag === "string") {
                return { ...e, obj: newObj, idx: newIdx, a: newObj.a };
            } else if (newObj.a.tag === "list") {
                return { ...e, obj: newObj, idx: newIdx, a: newObj.a.type }
            }
        }
    }
}

export function tcFuncStmt(s : FuncStmt<any>, envList: SymbolTableList, currentReturn : Type) : FuncStmt<Type> {
    if (s.ret.tag !== "none" && !didAllPathReturn(s.body)) {
        throw new TypeError(`TYPE ERROR: All path in function ${s.name} must have a return statement`);
    }
    envList.addScope();
    checkDefinition(s.body);
    // define param
    s.params.forEach(p => envList.defineNewSymbol(p.name, {tag: "var", type: p.type, scope: Scope.LOCAL}));

    // define local variables and functions
    s.body.forEach(s => {
        if (s.tag === "func") {
            envList.defineNewSymbol(s.name, {tag: "func", type: [s.params.map(p => p.type), s.ret]});
        }
        else if (s.tag === "var") {
            envList.defineNewSymbol(s.var.name, {tag: "var", type: s.var.type, scope: Scope.LOCAL});
        }
        else if (s.tag === "scope") {
            const scope = s.global ? SearchScope.GLOBAL : SearchScope.NONLOCAL;
            const [found, symbol] = envList.lookUpSymbol(s.name, scope);
            if (!found || symbol.tag !== "var") {
                throw new ReferenceError(`not a ${s.global? "global": "nonlocal"} variable: ${s.name}`);
            }

            if (found && !s.global && symbol.scope === Scope.GLOBAL) {
                // check if a nonlocal variable indeed refer to a nonlocal variable
                throw new ReferenceError(`not a nonlocal variable: ${s.name}`);
            }

            envList.defineNewSymbol(s.name, {tag: "var", type: symbol.type, scope: s.global ? Scope.GLOBAL : Scope.NONLOCAL});
        }
    })

    const newBody = s.body.map(bs => tcStmt(bs, envList, s.ret));
    
    // exitCurrentEnv(envList);
    envList.removeScope();
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

        case "scope": {
            return {...s};
        }

        case "class": {
            // TODO: check if redefine class or method or field!
            // TODO: add super class fields into this
            let className = s.super;
            // track all the super class
            while (className !== "object") {
                const [found, superClassSymbol] = envList.lookUpSymbol(className, SearchScope.GLOBAL);
                if (!found || superClassSymbol.tag !== "class") {
                    throw new TypeError(`Class ${className} is not defined`)
                }
                let classData = superClassSymbol.type;

                // check if field is redefined
                s.fields.forEach((f)=> {
                    if (classData.fields.has(f.var.name)) {
                        throw new TypeError(`re-define field ${f.var.name} in class ${s.name}`);
                    }
                })

                // check if redefined method has same signature as super class
                s.methods.forEach((f) => {
                    if (classData.methods.has(f.name)) {
                        // check signature
                        const superMethod = classData.methods.get(f.name);
                        if (f.params.length != superMethod[0].length 
                            || !f.params.slice(1).every((p, i) => isTypeEqual(p.type, superMethod[0][i+1]))
                            || !isTypeEqual(f.ret, superMethod[1])) {
                            throw new TypeError(`method signature mismatch with superclass for ${f.name}`);
                        }
                    }
                })

                className = classData.super;
            }
            
            // check if first parameter, aka self, is the same type as class
            s.methods.forEach((f) => {
                if (f.params.length <= 0 || !isTypeEqual(f.params[0].type, buildClassType(s.name))) {
                    throw new TypeError(`first parameter of method ${f.name} should be type of class`);
                }
            });
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
                const initFunc: FuncStmt<any> = {
                    tag: "func", 
                    name: "__init__", 
                    params: [{name: "self", type: {tag: "class", name: s.name}}],
                    ret: {tag: "class", name: s.name},
                    body: []
                }
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
            
            if (lhs.tag !== "getfield" && lhs.tag !== "index" && lhs.tag !== "name") {
                throw new TypeError(`Can only assign to Lvalue`);
            }
            if (lhs.tag === "name") {
                const [found, _] = envList.lookUpSymbol(lhs.name, SearchScope.LOCAL);
                if (!found) {
                    throw new ReferenceError(`Reference error: ${lhs.name} is not defined`);
                }
            }
            // can not move to isAssignable, as we need lhs.tag
            // string[index] is valid but not assignable
            if (lhs.tag === "index" && lhs.obj.a.tag !== "list") {
                throw new TypeError(`\`${lhs.obj.a.tag}\` is not a list type`);
            }
            if( !isAssignable(lhs.a, rhs.a) && !isSubClass(rhs.a, lhs.a, envList)) {
                throw new TypeError(`Cannot assign ${typeStr(rhs.a)} to ${typeStr(lhs.a)}`);
            }
            
            return { ...s, name: lhs, value: rhs };
        }

        case "if": {
            const newIfCond = tcExpr(s.if.cond, envList);
            if(newIfCond.a.tag !== "bool") {
                throw new TypeError("TYPE ERROR: Expect type BOOL in condition")
            }

            const newIfBody = s.if.body.map(bs => tcStmt(bs, envList, currentReturn));
            const newElif = s.elif.map(bs => {
                let cond = tcExpr(bs.cond, envList);
                if(cond.a.tag !== "bool") {
                    throw new TypeError("TYPE ERROR: Expect type BOOL in condition")
                }

                let body = bs.body.map(bb => tcStmt(bb, envList, currentReturn))

                return {
                    cond: cond, 
                    body: body
                }});
            
            const newElseBody = s.else.map(bs => tcStmt(bs, envList, currentReturn));
            return {...s, if: {cond: newIfCond, body: newIfBody}, elif: newElif, else: newElseBody}
        }

        case "while": {
            const newCond = tcExpr(s.while.cond, envList);
            if(newCond.a.tag !== "bool") {
                throw new TypeError("TYPE ERROR: Expect type BOOL in condition")
            }
            const newBody = s.while.body.map(bs => tcStmt(bs, envList, currentReturn));
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
        case "for": {
            const newCnt = tcNameExpr(s.loopVar, envList);
            const newIter  = tcExpr(s.iter, envList);
            if (!isIterable(newIter.a)) {
                throw new TypeError(`Cannot iterate over value of type ${typeStr(newCnt.a)}`);
            }
            // TODO: should compare to newArray.a.type
            if ((newIter.a.tag === "list" && !isAssignable(newCnt.a, newIter.a.type)) || 
                (newIter.a.tag === "string" && !isAssignable(newCnt.a, newIter.a))) {
                throw new TypeError(`Expected type ${typeStr(newCnt.a)} but got type ${typeStr(newIter.a)}`);
            }
            const newBody = s.body.map(stmt => tcStmt(stmt, envList, currentReturn));
            return {...s, loopVar: newCnt, iter: newIter, body: newBody };
        }
    }
}

export function checkDefinition(p : Stmt<any>[]) {
    var LastDeclare = -1;
    var firstStmt = p.length;
    for(var i = 0; i < p.length; i ++) {
        if (p[i].tag === "var" || p[i].tag === "func" || p[i].tag === "class" || p[i].tag === "scope") {
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
    // var envList: SymbolTableList = [];

    // envList = enterNewEnv(envList);
    var env = new Env<UnionSymbol>();   
    // check if all definition are proceeding statements
    checkDefinition(p);
    // define all the functions and variables
    env.defineNewSymbol("object", { tag: "class", 
        type: { 
            super: "", methods: new Map<string, [Type[], Type]>(), 
            fields: new Map<string, Type>() 
        } 
    });

    p.forEach(s => {
        if (s.tag === "func") {
            env.defineNewSymbol(s.name, { tag: "func", type: [s.params.map(p => p.type), s.ret] });
        }
        else if (s.tag === "var") {
            env.defineNewSymbol(s.var.name, { tag: "var", type: s.var.type, scope: Scope.GLOBAL});
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
            env.defineNewSymbol(s.name, { tag: "class", type: { super: s.super, methods, fields } });
        }
    })

    return p.map(s => {
        const res = tcStmt(s, env, {tag: "none"});
        return res;
    });
}