import { readFileSync } from 'fs';
import { compile, run } from './compiler';


if(process.argv.length != 3) {
    console.log("Usage: node node-main.js [filename]")
    process.exit(1)
}

const file = readFileSync(process.argv[2], 'utf-8');
const wasmSource = compile(file)
console.log(wasmSource);

const importObject = {
    imports: {
        print_num: (arg : any) => {
            console.log(arg)
            importObject.output += arg;
            importObject.output += "\n";
            return arg;
        },
        print_bool: (arg : any) => {
            if(arg === 0) {
                console.log("False")
                importObject.output += "False";
                importObject.output += "\n";
            }
            else {
                console.log("True")
                importObject.output += "True";
                importObject.output += "\n";
            }
            return arg;
        },
        print_none: (arg: any) => {
            console.log("None")
            importObject.output += "None";
            importObject.output += "\n";
            return arg;
        },
        print_char: (arg: any, lf: any) => {
            console.log(String.fromCharCode(arg));
            importObject.output += String.fromCharCode(arg);
            if (lf === 1) importObject.output += "\n";
            return arg;
        }
    },
    check: {
        check_init: (arg: any) => {
            if (arg <= 0) {
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
    },
    output: ""
};

run(wasmSource, importObject).then((v) => console.log(v))