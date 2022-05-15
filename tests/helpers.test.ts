import { compile, run as runT} from '../compiler';
import { parse } from "../parser";
import { tcProgram } from "../tc";
import { ExprStmt } from "../ast";
import { importObject } from './import-object.test';


// Modify typeCheck to return a `Type` as we have specified below
export function typeCheck(source: string) : Type {
    const stmts = parse(source);
    const newStmts = tcProgram(stmts);
    const lastStmt = newStmts[newStmts.length - 1];
    if (lastStmt.tag !== "expr") {
        return "none"
    }
    const lastType = (lastStmt as ExprStmt<any>).expr.a;
    if (lastType.tag === "int" || lastType.tag === "bool" || lastType.tag === "none" || lastType.tag === "string") 
        return lastType.tag;
    else if (lastType.tag === "class") 
        return CLASS(lastType.name);
    else if (lastType.tag === "list") {
        return LIST(lastType.type);
    }
    else {
        return "none";
    }
}



// Modify run to use `importObject` (imported above) to use for printing
export async function run(source: string) {
    const wasmSource = compile(source);
    try {
        let newImportObject = {
            ...importObject,
            check: {
                check_init: (arg: any) => {
                    if (arg === 0) {
                        throw new Error("RUNTIME ERROR: object not intialized");
                    }
                    return arg;
                },
                check_index: (length:any, arg: any) => {
                    if (arg >= length || arg < 0) {
                        throw new Error("RUNTIME ERROR: Index out of bounds");
                    }
                    return arg;
                },
                check_if_none: () => {
                    return 0;
                }
            }
        };
        const v = await runT(wasmSource, newImportObject);
        return v;
    } catch (err){
        throw new Error("RUNTIME ERROR: " + err.message)
    }
}


type Type =
  | "int"
  | "bool"
  | "none"
  | "string"
  | { tag: "object", class: string }
  | { tag: "list", type: Type }
  | { tag: "string" }

export const NUM : Type = "int";
export const BOOL : Type = "bool";
export const NONE : Type = "none";
export const STRING: Type = "string";
export function CLASS(name : string) : Type { 
  return { tag: "object", class: name }
};

export function LIST(typ: any ): Type {
    // console.log(typ);
    // console.log(typ.hasOwnProperty("tag"));
    // return "int";
    if (typ.hasOwnProperty("tag")) {
        if (typ.tag === "class") 
            return { tag: "list", type: typ.name };
        else if (typ.tag === "int" || typ.tag === "bool" || typ.tag === "none") {
            return { tag: "list", type: typ.tag };
        }
        else if (typ.tag === "list") {
            return { tag: "list", type: LIST(typ.type) };
        }
    } else {
        return { tag: "list", type: typ};
    }
};
