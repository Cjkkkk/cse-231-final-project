export enum BinOp {Plus = "PLUS", Minus = "MINUS", Mul = "MUL", Div = "DIV", Mod = "MOD", Equal = "EQUAL", Unequal = "UNEQUAL", Le = "LE", Ge = "GE", Lt = "LT", Gt = "GT", Is = "IS"}
export enum UniOp {Not = "NOT", Neg = "NEG"}
export type Literal = "None" | true | false | number

export const INT = { tag: "int"} 
export const BOOL = {tag: "bool"} 
export const NONE = {tag: "none"} 

export type Type = 
    { tag: "int"} 
    | {tag: "bool"} 
    | {tag: "none"} 
    | {tag: "class", name: string} 
    | {tag: "callable", params: Type[], ret: Type}
    | {tag: "list", type: Type}
    | {tag: "tuple", members: Type[]}

export function typeStr(t: Type): string {
    switch (t.tag) {
        case "int":
        case "bool":
        case "none":
            return t.tag;
        case "class":
            return t.name;
        case "callable":
            return `callable[[${t.params.map((v)=>typeStr(v)).join(", ")}], ${typeStr(t.ret)}]`;
        case "list":
            return `list[${typeStr(t.type)}]`;
        case "tuple":
            return `tuple[${t.members.map((v)=>typeStr(v)).join(", ")}]`;
        default:
            throw new TypeError("TYPE ERROR: Type not supported")
    }
}

export function isTypeEqual(lhs: Type, rhs: Type): boolean {
    if (lhs.tag !== rhs.tag) return false;
    else if (lhs.tag === "int" || lhs.tag === "bool" || lhs.tag === "none") return true;
    else if (lhs.tag === "class" && rhs.tag === "class") return lhs.name === rhs.name;
    else if (lhs.tag === "callable" && rhs.tag === "callable") {
        if (lhs.params.length != rhs.params.length) return false;
        lhs.params.forEach((t, i) => {
            if (!isTypeEqual(t, rhs.params[i])) return false;
        })
        return isTypeEqual(lhs.ret, rhs.ret);
    } else {
        throw new TypeError("TYPE ERROR: Do not support this type")
    }
}

export function isAssignable(lhs: Type, rhs: Type): boolean {
    return isTypeEqual(lhs, rhs) || (isClass(lhs) && isTypeEqual(rhs, {tag: "none"}))
}

export function isClass(a: Type) {
    return a.tag === "class"
}

export type TypeDef = {name: string, type: Type}
export type CondBody<A> = {cond: Expr<A>, body: Stmt<A>[]}


export type FuncStmt<A> = { a?: A, tag: "func", name: string, params: TypeDef[], ret: Type, body: Stmt<A>[]}
export type VarStmt<A> = { a?: A, tag: "var", var: TypeDef, value: Expr<A>}
export type IfStmt<A> = { a?: A, tag: "if", if: CondBody<A>, elif: CondBody<A>[], else: Stmt<A>[]}
export type AssignStmt<A> = { a?: A, tag: "assign", name: Expr<A>, value: Expr<A>}
export type WhileStatement<A> = { a?: A, tag: "while", while: CondBody<A>}
export type PassStmt<A> = { a?: A, tag: "pass"}
export type ReturnStmt<A> = { a?: A, tag: "return", value: Expr<A>}
export type ExprStmt<A> = { a?: A, tag: "expr", expr: Expr<A> }
export type ClassStmt<A> = { a?: A, tag: "class", name: string, super: string, methods: FuncStmt<A>[], fields: VarStmt<A>[]}

export type LiteralExpr<A> = { a?: A, tag: "literal", value: Literal } 
export type NameExpr<A> = { a?: A, tag: "name", name: string}
export type UnaryExpr<A> = { a?: A, tag: "unary", op: UniOp, expr: Expr<A>}
export type BinaryExpr<A> = { a?: A, tag: "binary", op: BinOp, lhs: Expr<A>, rhs: Expr<A>}
export type CallExpr<A> = { a?: A, tag: "call", name: string, args: Expr<A>[]}
export type GetFieldExpr<A> = { a?: A, tag: "getfield", obj: Expr<A>, name: string}
export type MethodExpr<A> = { a?: A, tag: "method", obj: Expr<A>, name: string, args: Expr<A>[]}

export type Stmt<A> =
    | FuncStmt<A>
    | VarStmt<A>
    | AssignStmt<A>
    | IfStmt<A>
    | WhileStatement<A>
    | PassStmt<A>
    | ReturnStmt<A>
    | ExprStmt<A>
    | ClassStmt<A>

export type Expr<A> =
    | LiteralExpr<A>
    | NameExpr<A>
    | UnaryExpr<A>
    | BinaryExpr<A>
    | CallExpr<A>
    | GetFieldExpr<A>
    | MethodExpr<A>