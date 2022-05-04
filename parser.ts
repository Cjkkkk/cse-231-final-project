import { assert } from "chai";
import { parser } from "lezer-python";
import { TreeCursor } from "lezer-tree";
import { BinOp, Expr, Stmt, UniOp, Type, TypeDef, CondBody, FuncStmt, VarStmt, isClass, NameExpr} from "./ast";


export function traverseArgs(c : TreeCursor, s : string) : Array<Expr<any>> {
    var originName = c.node.type.name;
    var args: Array<Expr<any>> = [];
    c.firstChild();
    c.nextSibling();
    while(c.type.name !== ")") {
        args.push(traverseExpr(c, s));
        c.nextSibling(); // Focuses on either "," or ")"
        c.nextSibling(); // Focuses on a VariableName
    }
    c.parent();
    assert(c.node.type.name === originName);
    return args;
}


export function traverseTypeDef(c : TreeCursor, s : string): Type {
    var originName = c.node.type.name;
    var type: Type = undefined;
    c.firstChild();  // Enter TypeDef: 
    c.nextSibling(); // Focuses on type itself
    type = traverseType(c, s);
    c.parent();
    assert(c.node.type.name === originName);
    return type;
}
export function traverseType(c : TreeCursor, s : string): Type {
    var originName = c.node.type.name;
    var type: Type = undefined;
    switch(c.type.name) {
        case "VariableName": {
            const name = s.substring(c.from, c.to);
            if (name === "int") type = {tag: "int"};
            else if (name === "bool") type = {tag: "bool"};
            else if (name === "none") type = {tag: "none"};
            else {
                type = {tag: "class", name};
            }
            break;
        }
        case "MemberExpression": {
            c.firstChild();
            const name = s.substring(c.from, c.to);
            if (name === "Callable") {
                c.nextSibling(); // [
                c.nextSibling(); // ArrayExpression
                c.firstChild(); //  [
                const params = traverseArray(c, s);
                c.parent();
                c.nextSibling(); // comma
                c.nextSibling(); // ret
                const ret = traverseType(c, s);
                c.nextSibling(); // ]
                type = {tag: "callable", params, ret};
            } else if (name === "List"){
                c.nextSibling(); // [
                const members = traverseArray(c, s);
                assert(members.length === 1)
                type = {tag: "list", type: members[0]}; 
            } else if (name === "Tuple"){
                c.nextSibling(); // [
                const members = traverseArray(c, s);
                type = {tag: "tuple", members};
            }
            else {
                throw new Error("PARSE ERROR: Do not support this type now: " + name);
            }
            c.parent();
            break;
        }
        default:
            throw new Error("Unknown type: " + c.type.name);
    }
    assert(c.node.type.name === originName);
    return type;
}


export function traverseArray(c : TreeCursor, s : string) : Array<Type> {
    // for [type...]
    const types: Type[] = [];
    c.nextSibling(); // Focuses on a type
    while(c.type.name !== "]") {
        var type = traverseType(c, s);
        c.nextSibling(); // Move on to comma or "]"
        types.push(type);
        c.nextSibling(); // Focuses on a type
    }
    return types;
}


export function traverseParameters(c : TreeCursor, s : string) : Array<TypeDef> {
    var originName = c.node.type.name;
    c.firstChild();  // Focuses on open paren
    const parameters = []
    c.nextSibling(); // Focuses on a VariableName
    while(c.type.name !== ")") {
        var name = s.substring(c.from, c.to);
        c.nextSibling(); // Focuses on "TypeDef", hopefully, or "," if mistake
        var nextTagName = c.type.name; // NOTE(joe): a bit of a hack so the next line doesn't if-split
        if(nextTagName !== "TypeDef") { 
            throw new Error("Missed type annotation for parameter " + name)
        };
        var type = traverseTypeDef(c, s);
        c.nextSibling(); // Move on to comma or ")"
        parameters.push({name, type});
        c.nextSibling(); // Focuses on a VariableName
    }
    c.parent();       // Pop to ParamList
    assert(c.node.type.name === originName);
    return parameters;
}

export function traverseExpr(c : TreeCursor, s : string) : Expr<any> {
    var originName = c.node.type.name;
    switch(c.type.name) {
        case "Boolean": {
            if (s.substring(c.from, c.to) === "True") {
                return { tag: "literal", value: true };
            } else {
                return { tag: "literal", value: false };
            }
        }
        case "None":
            return { tag: "literal", value: "None" };
        case "Number":
            return { tag: "literal", value: Number(s.substring(c.from, c.to)) }
        case "self":
        case "PropertyName":
        case "VariableName":
            return {
                tag: "name",
                name: s.substring(c.from, c.to)
            };
        case "ParenthesizedExpression": {
            c.firstChild(); // (
            c.nextSibling();
            var rexpr = traverseExpr(c, s);
            c.parent();
            assert(c.node.type.name === originName);
            return rexpr;
        }
        case "UnaryExpression": {
            c.firstChild();
            var uniOp: UniOp;
            switch(s.substring(c.from, c.to)) {
                case "not":
                    uniOp = UniOp.Not;
                    break;
                case "-":
                    uniOp = UniOp.Neg;
                    break;
                default:
                    throw new Error("PARSE ERROR: unknown Unary operator");
            }
            c.nextSibling();
            const expr = traverseExpr(c, s);
            c.parent();
            assert(c.node.type.name === originName);
            return {
                tag: "unary",
                op: uniOp,
                expr: expr
            };
        }
        case "BinaryExpression": {
            c.firstChild();
            const left = traverseExpr(c, s);
            c.nextSibling(); // go to left
            var op: BinOp; 
            switch(s.substring(c.from, c.to)) {
                case "+":
                    op = BinOp.Plus;
                    break;
                case "-":
                    op = BinOp.Minus;
                    break;
                case "*":
                    op = BinOp.Mul;
                    break;
                case "//":
                    op = BinOp.Div;
                    break;
                case "%":
                    op = BinOp.Mod;
                    break;
                case "==":
                    op = BinOp.Equal;
                    break;
                case "!=":
                    op = BinOp.Unequal;
                    break;
                case ">=":
                    op = BinOp.Ge;
                    break;
                case "<=":
                    op = BinOp.Le;
                    break;
                case "<":
                    op = BinOp.Lt;
                    break;
                case ">":
                    op = BinOp.Gt;
                    break;
                case "is":
                    op = BinOp.Is;
                    break;
                default:
                    throw new Error("PARSE ERROR: unknown binary operator: " + s.substring(c.from, c.to))
            };
            c.nextSibling(); // go to right
            const right = traverseExpr(c, s);
            c.parent();
            assert(c.node.type.name === originName);
            return {
                tag: "binary",
                op: op,
                lhs: left,
                rhs: right
            };
        }
        case "CallExpression": {
            c.firstChild();
            const name = traverseExpr(c, s);
            c.nextSibling();
            const args = traverseArgs(c, s);
            c.parent();
            assert(c.node.type.name === originName);
            
            if( name.tag === "name") {
                return {
                    tag: "call",
                    name: name.name,
                    args,
                };
            } else if (name.tag === "getfield") {
                return {
                    tag: "method",
                    obj: name.obj,
                    name: name.name,
                    args
                }
            } else {
                throw new Error("Internal error: should not be in here")
            }
        }

        case "MemberExpression":
            c.firstChild();
            const obj = traverseExpr(c, s);
            c.nextSibling(); // .
            c.nextSibling();
            const name = s.substring(c.from, c.to);
            c.parent();
            assert(c.node.type.name === originName);
            return {
                tag: "getfield",
                obj,
                name
            }

        // case "ArrayExpression":
        //     c.firstChild();
        //     c.nextSibling()
        default:
            throw new Error("Could not parse expr at " + c.type.name + c.from + " " + c.to + ": " + s.substring(c.from, c.to));
    }
}

export function traverseCondBody(c : TreeCursor, s : string): CondBody<any> {
    var cond = traverseExpr(c, s);
    c.nextSibling(); // if body
    var body = traverseBody(c, s);
    return {cond, body};
}

export function traverseBody(c: TreeCursor, s: string): Stmt<any>[] {
    var body = [];
    c.firstChild(); // :
    while(c.nextSibling()) {
        body.push(traverseStmt(c, s));
    }
    c.parent();
    return body;
}

export function traverseStmt(c : TreeCursor, s : string) : Stmt<any> {
    var originName = c.node.type.name;
    switch(c.node.type.name) {      
        case "ClassDefinition": {
            c.firstChild(); // class
            c.nextSibling();
            const name = s.substring(c.from, c.to); // class name
            if (name === "int" || name === "bool" || name === "none") {
                throw new Error(`can not define class with name: ${name}`)
            }
            c.nextSibling(); 
            // inheritance
            // ignore it for now
            const args = traverseArgs(c, s);
            if (args.length !== 1) {
                throw new Error(`Only support one super class but got ${args.length}`);
            }

            c.nextSibling(); // body
            const body = traverseBody(c, s);
            const fields: VarStmt<any>[] = [];
            const methods: FuncStmt<any>[] = [];
            body.forEach((b) => {
                if(b.tag === "func") {
                    methods.push(b);
                }
                else if(b.tag === "var") {
                    fields.push(b);
                }
            })
            c.parent();
            assert(c.node.type.name === originName);
            return {
                tag: "class",
                super: (args[0] as NameExpr<any>).name,
                name,
                methods,
                fields
            };
        }
        case "AssignStatement": {
            c.firstChild(); // go to name
            const name = traverseExpr(c, s);
            c.nextSibling(); // go to equals or typedef
            var type : Type = undefined;
            if (c.type.name === "TypeDef") {
                type = traverseTypeDef(c, s);
                c.nextSibling(); // go to equals
            }
            c.nextSibling(); // go to value
            const value = traverseExpr(c, s);
            c.parent();
            assert(c.node.type.name === originName);
            if (type === undefined) {
                return {
                    tag: "assign",
                    name,
                    value: value
                }
                
            } else {
                return {
                    tag: "var",
                    var: {name: (name as NameExpr<any>).name, type},
                    value: value
                }
                
            }
        }
        case "FunctionDefinition": {
            c.firstChild();  // Focus on def
            c.nextSibling(); // Focus on name of function
            var name = s.substring(c.from, c.to);
            c.nextSibling(); // Focus on ParamList
            var params = traverseParameters(c, s)
            c.nextSibling(); // Focus on Body or TypeDef
            var ret : Type = {tag: "none"};
            var maybeTD = c;
            if(maybeTD.type.name === "TypeDef") {
                ret = traverseTypeDef(c, s);
            }
            c.nextSibling(); // body
            const body = traverseBody(c, s);
            c.parent();      // Pop to FunctionDefinition
            assert(c.node.type.name === originName);
            return {
                tag: "func", 
                name: name,
                params: params,
                body: body, 
                ret: ret
            }
        }
        case "IfStatement": {
            c.firstChild(); // if
            c.nextSibling(); // if expr
            var ifCondBody = traverseCondBody(c, s);
            var elifCondBody = [];
            while(c.nextSibling() && s.substring(c.from, c.to) === "elif") {
                // elif
                c.nextSibling(); // if expr
                var elifStmt = traverseCondBody(c, s);
                elifCondBody.push(elifStmt);
            }
            // parse else
            var elseBody: Stmt<any>[] = [];
            if (s.substring(c.from, c.to) === "else") {
                c.nextSibling(); // elif body
                elseBody = traverseBody(c, s);
            }

            c.parent();
            assert(c.node.type.name === originName);
            return {
                tag: "if",
                if: ifCondBody,
                elif: elifCondBody,
                else: elseBody
            }
        }
        case "WhileStatement": {
            c.firstChild(); // while keyword
            c.nextSibling(); // while expr
            var whileCondBody = traverseCondBody(c, s);
            c.parent();
            assert(c.node.type.name === originName);
            return {
                tag: "while",
                while: whileCondBody
            }
        }
        case "⚠":
        case "PassStatement": {
            assert(c.node.type.name === originName);
            return { tag: "pass"}
        }
        case "ReturnStatement": {
            c.firstChild(); // return keyword
            var maybeRet = c.nextSibling();
            var dummyC = c;
            var returnExpr: Expr<any> = {tag: "literal", value: "None"};
            if (maybeRet && dummyC.node.type.name !== "⚠") {
                returnExpr = traverseExpr(c, s);
            }
            c.parent();
            assert(c.node.type.name === originName);
            return { tag: "return", value: returnExpr }
        }
        case "ExpressionStatement": {
            c.firstChild();
            const expr = traverseExpr(c, s);
            c.parent(); // pop going into stmt
            assert(c.node.type.name === originName);
            return { tag: "expr", expr: expr }
        }
        default:
            throw new Error("Could not parse stmt at " + c.node.from + " " + c.node.to + ": " + s.substring(c.from, c.to));
    }
}

export function traverse(c : TreeCursor, s : string) : Array<Stmt<any>> {
    switch(c.node.type.name) {
        case "Script": {
            const stmts = [];
            c.firstChild();
            do {
                stmts.push(traverseStmt(c, s));
            } while(c.nextSibling())
            // console.log("traversed " + stmts.length + " statements ", stmts, "stopped at " , c.node);
            return stmts;
        }
        default:
            throw new Error("Could not parse program at " + c.node.from + " " + c.node.to);
    }
}


export function parse(source : string) : Array<Stmt<any>> {
    const t = parser.parse(source);
    return traverse(t.cursor(), source);
}
