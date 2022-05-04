import wabt from 'wabt';
import {Stmt, Expr, Type, BinOp, UniOp, ClassStmt, LiteralExpr} from './ast';
import {parse} from './parser';
import {tcProgram } from './tc';

type Env = Set<string>;
type Node = {subs: Node[], cls: ClassStmt<Type>};
type MethodContext = {mapping: Map<string, string>, order: string[], offset: number};
type FieldContext = Map<string, number>;
type MethodContextMap = Map<string, MethodContext>;
type FieldContexMap = Map<string, FieldContext>;
var loop_label = 0;

function variableNames(stmts: Stmt<Type>[]) : string[] {
    const vars : Array<string> = [];
    stmts.forEach((stmt) => {
        if(stmt.tag === "var") { vars.push(stmt.var.name); }
    });
    return vars;
}

function funs(stmts: Stmt<Type>[]) : Stmt<Type>[] {
    return stmts.filter(stmt => stmt.tag === "func");
}

function nonFuns(stmts: Stmt<Type>[]) : Stmt<Type>[] {
    return stmts.filter(stmt => stmt.tag !== "func" && stmt.tag !== "class" );
}

function classes(stmts: Stmt<Type>[]) : Stmt<Type>[] {
    return stmts.filter(stmt => stmt.tag === "class");
}

function varsFunsClassesStmts(stmts: Stmt<Type>[]) : [string[], Stmt<Type>[], Stmt<Type>[], Stmt<Type>[]] {
    return [variableNames(stmts), funs(stmts), classes(stmts), nonFuns(stmts)];
}

export async function run(watSource : string, config: any) : Promise<number> {
    const wabtApi = await wabt();

    const parsed = wabtApi.parseWat("example", watSource);
    const binary = parsed.toBinary({});
    const wasmModule = await WebAssembly.instantiate(binary.buffer, config);
    return (wasmModule.instance.exports as any)._start();
}

export function binOpStmts(op : BinOp) {
    switch(op) {
        case BinOp.Plus: return [`i32.add`];
        case BinOp.Minus: return [`i32.sub`];
        case BinOp.Mul: return [`i32.mul`];
        case BinOp.Div: return [`i32.div_s`];
        case BinOp.Mod: return [`i32.rem_s`];
        case BinOp.Equal: return [`i32.eq`];
        case BinOp.Unequal: return [`i32.ne`];
        case BinOp.Gt: return [`i32.gt_s`];
        case BinOp.Ge: return [`i32.ge_s`];
        case BinOp.Lt: return [`i32.lt_s`];
        case BinOp.Le: return [`i32.le_s`];
        case BinOp.Is: return [`i32.eq`];
        default:
            throw new Error(`Unhandled or unknown binary op: ${op}`);
    }
}

export function unaryOpStmts(op : UniOp) {
    switch(op) {
        case UniOp.Not: return [`i32.eqz`];
        case UniOp.Neg: return [`i32.sub`];
        default:
            throw new Error(`Unhandled or unknown unary op: ${op}`);
    }
}

export function codeGenExpr(expr : Expr<Type>, locals: Env, fcm: FieldContexMap, mcm: MethodContextMap) : Array<string> {
    switch(expr.tag) {
        case "literal": {
            // TODO: fix none
            if( expr.value === "None") {
                return [`i32.const -2147483648`];
            } else if (expr.value === true) {
                return [`i32.const 1`];
            } else if (expr.value === false) {
                return [`i32.const 0`];
            } else {
                return [`i32.const ${expr.value}`];
            }
        }
        case "name": {
            // Since we type-checked for making sure all variable exist, here we
            // just check if it's a local variable and assume it is global if not
            if(locals.has(expr.name)) { return [`local.get $${expr.name}`]; }
            else { return [`global.get $${expr.name}`]; }
        }
        case "unary": {
            var exprs = codeGenExpr(expr.expr, locals, fcm, mcm);
            if (expr.op === UniOp.Neg) {
                // does not have i32.neg
                exprs = codeGenExpr({tag: "literal", value: 0}, locals, fcm, mcm).concat(exprs);
            }
            const opstmts = unaryOpStmts(expr.op);
            return [...exprs, ...opstmts];
        }
        case "binary": {
            const lhsExprs = codeGenExpr(expr.lhs, locals, fcm, mcm);
            const rhsExprs = codeGenExpr(expr.rhs, locals, fcm, mcm);
            const opstmts = binOpStmts(expr.op);
            return [...lhsExprs, ...rhsExprs, ...opstmts];
        }
        case "call":{
            const valStmts = expr.args.map(e => codeGenExpr(e, locals, fcm, mcm)).flat();
            
            let toCall = expr.name;
            if (expr.name === "print") {
                switch(expr.args[0].a.tag) {
                    case "bool": toCall = "print_bool"; break;
                    case "int": toCall = "print_num"; break;
                    case "none": toCall = "print_none"; break;
                }
            } else if(fcm.has(expr.name)) {
                // is class init call
                valStmts.push(`i32.const -2147483648`);
                toCall = expr.name + "$__init__";
            }
            valStmts.push(`call $${toCall}`);
            return valStmts;
        }
        case "method": {
            // TODO: add self here
            const objStmts = codeGenExpr(expr.obj, locals, fcm, mcm);
            const argsStmts = expr.args.map(e => codeGenExpr(e, locals, fcm, mcm)).flat();
            // return [
            //     ...objStmts, // self
            //     ...argsStmts,
            //     `call $${(expr.obj.a as {tag: "class", name: string}).name}$${expr.name}`
            // ];

            const className = (expr.obj.a as {tag: "class", name: string}).name;
            const mc = mcm.get(className);
            return [
                ...objStmts, // self
                `local.set $scratch`,
                `local.get $scratch`,
                ...argsStmts,
                `local.get $scratch`, // self
                `i32.load`, // get v_table pointer
                `i32.const ${mc.order.indexOf(expr.name)}`, // offset
                `i32.add`, // get index into the table
                `call_indirect (type $${className}$${expr.name})`
            ];
        }

        case "getfield": {
            const ObjStmt = codeGenExpr(expr.obj, locals, fcm, mcm);
            return [
                ...ObjStmt,
                `i32.const ${fcm.get((expr.obj.a as {tag: "class", name: string}).name).get(expr.name)}`,
                `i32.add`,
                `i32.load`
            ]
        }
    }
}

export function literalToString(lit: LiteralExpr<any>): string {
    if(lit.value === true) return "True";
    else if(lit.value === false) return "False";
    else return String(lit.value);
}

export function codeGenStmt(stmt: Stmt<Type>, locals: Env, fcm: FieldContexMap, mcm: MethodContextMap) : Array<string> {
    switch(stmt.tag) {
        case "class": {
            const vtableEnabled = 1;
            // generate for __init__ function
            let initAllocStmts: string[] = [];
            // add vtable pointer here
            // TODO: determine the value of vtable pointer
            initAllocStmts.push(
                `global.get $heap`,
                `i32.const ${mcm.get(stmt.name).offset}`,
                `i32.store`
            );

            stmt.fields.map((f, i)=>{
                initAllocStmts.push(
                    `global.get $heap`,
                    `i32.const ${(i + vtableEnabled) * 4}`,
                    `i32.add`,
                    ...codeGenExpr(f.value, locals, fcm, mcm),
                    `i32.store`
                )
            });

            initAllocStmts.push(
                `global.get $heap`,
                `global.get $heap`,
                `i32.const ${(stmt.fields.length + vtableEnabled) * 4}`,
                `i32.add`,
                `global.set $heap`
            );
            
            const initMethod = stmt.methods.filter((f)=>f.name === "__init__");
            const nonInitMethod = stmt.methods.filter((f)=>f.name !== "__init__");
            const nonInitMethodStmts = nonInitMethod.map((f) => codeGenStmt({...f, name: `${stmt.name}$${f.name}`}, locals, fcm, mcm)).flat();
            var initMethodStmts:string[] = [];

            if (initMethod.length != 0) {
                initMethodStmts = codeGenStmt({...initMethod[0], name: `${stmt.name}$${initMethod[0].name}`}, locals, fcm, mcm);
                let idx = 0;
                initMethodStmts.forEach((s)=>{if(s.includes("local $")) idx += 1;});
                initMethodStmts = [...initMethodStmts.slice(0, idx + 1),  ...initAllocStmts, `local.set $self`, ...initMethodStmts.slice(idx + 1,-2), `local.get $self`, ')']
            } else {
                // TODO: remove this in the future
                initMethodStmts = [`(func $${stmt.name}$__init__ (param $self i32) (result i32)`, 
                        ...initAllocStmts, 
                        `)`];
            }

            return [...initMethodStmts, ...nonInitMethodStmts];
        }
        case "func": {
            const newLocals = new Set(locals);
            // Construct the environment for the function body
            const variables = variableNames(stmt.body);
            // Construct the code for params and variable declarations in the body
            const params = stmt.params.map(p => `(param $${p.name} i32)`).join(" ");
            const varDecls = variables.map(v => `(local $${v} i32)`);
            
            variables.forEach(v => newLocals.add(v));
            stmt.params.forEach(p => newLocals.add(p.name));
            
            const stmts = stmt.body.map(s => codeGenStmt(s, newLocals, fcm, mcm)).flat();
            return [`(func $${stmt.name} ${params} (result i32)`,
                    `(local $scratch i32)`,
                    ...varDecls,
                    ...stmts,
                    `i32.const 0`,
                    `)`];
        }
        case "var": {
            var valStmts = codeGenExpr(stmt.value, locals, fcm, mcm);
            if(locals.has(stmt.var.name)) { valStmts.push(`local.set $${stmt.var.name}`); }
            else { valStmts.push(`global.set $${stmt.var.name}`); }
            return valStmts;
        }
        case "assign": {
            if (stmt.name.tag === "name") {
                var valStmts = codeGenExpr(stmt.value, locals, fcm, mcm);
                if(locals.has(stmt.name.name)) { valStmts.push(`local.set $${stmt.name.name}`); }
                else { valStmts.push(`global.set $${stmt.name.name}`); }
                return valStmts;
            } else {
                var objStmts = codeGenExpr(stmt.name, locals, fcm, mcm);
                var valStmts = codeGenExpr(stmt.value, locals, fcm, mcm);
                // getfield as lhs
                objStmts.pop(); // should not load
                valStmts.push(`i32.store`);
                return [...objStmts, ...valStmts];
            }
        }
        case "if": {
            var result = [];
            var ifCond = codeGenExpr(stmt.if.cond, locals, fcm, mcm);

            var ifBody = stmt.if.body.map((v) => codeGenStmt(v, locals, fcm, mcm)).flat();
            var enclosingCount = 0;
            result.push(...ifCond, `(if`, `(then`, ...ifBody, `)`);
            enclosingCount += 1;
            for(var elif of stmt.elif) {
                var elifCond = codeGenExpr(elif.cond, locals, fcm, mcm);
                var elifBody = elif.body.map((v) => codeGenStmt(v, locals, fcm, mcm)).flat();;
                result.push(`(else`, ...elifCond, `(if`, `(then`, ...elifBody, `)`);
                enclosingCount += 2;
            }

            var elseBody = stmt.else.map((v) => codeGenStmt(v, locals, fcm, mcm)).flat();
            result.push(`(else`, ...elseBody, `)`, ...Array(enclosingCount).fill(")"));
            return result;
        }
        case "while": {
            var condLabel = loop_label;
            loop_label += 1;
            var bodyLabel = loop_label;
            loop_label += 1;
            var condExpr = codeGenExpr(stmt.while.cond, locals, fcm, mcm);

            // var locals = variableNames(stmt.while.body);
            // var varDecls = locals.map(v => `(local $${v} i32)`);

            var bodyStmts = stmt.while.body.map(s => codeGenStmt(s, locals, fcm, mcm)).flat();
            return [`(block $label_${bodyLabel}`,
                    `(loop $label_${condLabel}`,
                    ...condExpr,
                    `i32.eqz`,
                    `br_if $label_${bodyLabel}`,
                    // ...varDecls,
                    ...bodyStmts,
                    `br $label_${condLabel}`,`)`,`)`];
        }
        case "pass": {
            return [];
        }
        case "return": {
            var valStmts = codeGenExpr(stmt.value, locals, fcm, mcm);
            valStmts.push(`return`);
            return valStmts;
        }
        case "expr": {
            const result = codeGenExpr(stmt.expr, locals, fcm, mcm);
            result.push(`local.set $scratch`);
            return result;
        }
    }
}


function addIndent(stmts: Array<string>, ident: number) :Array<string> {
    for(let i = 0; i < stmts.length; i++) {
        if(stmts[i].startsWith("(func") 
            || stmts[i].startsWith("(elem") 
            || stmts[i].startsWith("(loop") 
            || stmts[i].startsWith("(block")
            || stmts[i].startsWith("(if")
            || stmts[i].startsWith("(then")
            || stmts[i].startsWith("(else")) {
            stmts[i] = " ".repeat(ident * 4) + stmts[i];
            ident += 1;
        } else if(stmts[i].startsWith(")")) {
            ident -= 1;
            stmts[i] = " ".repeat(ident * 4) + stmts[i];
        } else {
            stmts[i] = " ".repeat(ident * 4) + stmts[i];
        }
    }
    return stmts;
}

function buildGraph(classes: ClassStmt<Type>[]): Node {
    const root: Node = {subs: [], cls: {tag: "class", name: "object", super: "", fields: [], methods: []}}
    const NodeMap: Map<string, Node> = new Map<string, Node>();
    NodeMap.set("object", root);
    classes.forEach((c) => {
        NodeMap.set(c.name, {subs: [], cls: c});
    });
    classes.forEach((c) => {
        const subNode = NodeMap.get(c.name);
        const supNode = NodeMap.get(c.super);
        supNode.subs.push(subNode);
    });
    return root;
}


function buildMethodContext(root: Node) : MethodContextMap {
    let NodeList = [root];
    let cm = new Map<string, MethodContext>();
    let currentOffset = 0;
    while (NodeList.length !== 0) {
        const node = NodeList.pop();
        const classContext = {mapping: new Map<string, string>(), order: [] as string[], offset: currentOffset};
        cm.set(node.cls.name, classContext);
        node.subs.forEach((sub) => {
            NodeList.push(sub);
        });
        if (node.cls.name === "object") continue;
        const superClassContext = cm.get(node.cls.super);
        superClassContext.order.forEach((o) => classContext.order.push(o));
        superClassContext.mapping.forEach((v, k) => classContext.mapping.set(k, v));
        node.cls.methods.forEach((m)=> {
            if(!classContext.mapping.has(m.name)) {
                // new method which superclass does not have
                classContext.order.push(m.name);
            }
            classContext.mapping.set(m.name, `$${node.cls.name}$${m.name}`);
        })
        currentOffset += classContext.order.length;
    }

    return cm;
}

function addFieldFromSuperClass(root: Node) {
    // add super class field
    let NodeList = [root];
    while (NodeList.length !== 0) {
        const node = NodeList.pop();
        node.subs.forEach((sub) => {
            NodeList.push(sub);
            node.cls.fields.forEach((supF)=> {
                if (sub.cls.fields.some((subF)=>subF.var.name === supF.var.name)) {
                    throw new Error(`Redefine field ${supF.var.name} in sub class ${sub.cls.name}`);
                }
                sub.cls.fields.push(supF);
            })
        })
    }
}


function codeGenTable(root: Node, cm: MethodContextMap) : Array<string> {
    // generate vtable
    let tableStmts: string[] = [];
    let s = 0;
    cm.forEach((v, _) => {
        s += v.order.length;
    })
    tableStmts.push(`(table ${s} funcref)`)
    tableStmts.push(`(elem (i32.const 0)`)

    let typeSigStmts: string[] = [];
    let NodeList = [root];
    while (NodeList.length !== 0) {
        const node = NodeList.pop();
        const classContext = cm.get(node.cls.name);
        node.subs.forEach((sub) => {
            NodeList.push(sub);
        });
        if (node.cls.name === "object") continue;
        node.cls.methods.forEach((m) => {
            const params = m.params.map(p => `(param i32)`).join(" ");
            const name = `$${node.cls.name}$${m.name}`;
            typeSigStmts.push(`(type ${name} (func ${params} (result i32)))`);
        })
        tableStmts.push(classContext.order.map((o) => classContext.mapping.get(o)).join(" "));
    }
    tableStmts.push(`)`);
    return [...typeSigStmts, ...tableStmts];
}



function buildFieldContext(root: Node): FieldContexMap {
    const fm = new Map<string, Map<string, number>>();

    let NodeList = [root];
    while (NodeList.length !== 0) {
        const node = NodeList.pop();
        node.subs.forEach((sub) => {
            NodeList.push(sub);
        });
        if (node.cls.name === "object") continue;

        let env = new Map<string, number>();
        let currentOffset = 4;
        node.cls.fields.forEach((f) => {
            env.set(f.var.name, currentOffset);
            currentOffset += 4;
        });

        fm.set(node.cls.name, env);
    }
    return fm;
}


export function compile(source : string) : string {
    let ast = parse(source);
    ast = tcProgram(ast);

    const locals = new Set<string>();
    const [vars, funs, classes, stmts] = varsFunsClassesStmts(ast);
    

    const root = buildGraph(classes as ClassStmt<any>[]);
    addFieldFromSuperClass(root);

    const mcm = buildMethodContext(root);
    const fcm = buildFieldContext(root);

    const tableCode = addIndent(codeGenTable(root, mcm), 1).join("\n");
    const classCode = classes.map(f => addIndent(codeGenStmt(f, locals, fcm, mcm), 1)).map(f=> f.join("\n")).join("\n\n");
    const funsCode = funs.map(f => addIndent(codeGenStmt(f, locals, fcm, mcm), 1)).map(f => f.join("\n")).join("\n\n");
    const varDeclCode = addIndent(vars.map(v => `(global $${v} (mut i32) (i32.const 0))`), 1).join("\n");
    const allStmts = stmts.map(s => codeGenStmt(s, locals, fcm, mcm)).flat();

    const lastStmt = ast[ast.length - 1];
    const isExpr = lastStmt.tag === "expr";
    var retType = "";
    var main = "";
    if(isExpr) {
        retType = "(result i32)";
        main = addIndent([`(local $scratch i32)`, ...allStmts, "local.get $scratch"], 2).join("\n");
    } else {
        main = addIndent([`(local $scratch i32)`, ...allStmts], 2).join("\n");
    }

    return `
(module
    (func $print_num (import "imports" "print_num") (param i32) (result i32))
    (func $print_bool (import "imports" "print_bool") (param i32) (result i32))
    (func $print_none (import "imports" "print_none") (param i32) (result i32))
    (memory $0 1)
    (global $heap (mut i32) (i32.const 0))
${varDeclCode}
${tableCode}
${classCode}
${funsCode}
    (func (export "_start") ${retType}
${main}
    )
) `;
}