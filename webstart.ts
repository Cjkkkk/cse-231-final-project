import {compile, run} from './compiler';


document.addEventListener("DOMContentLoaded", async () => {
    function display(arg : string) {
        const output = document.getElementById("output");
        output.textContent += arg + "\n";
    }
    var importObject = {
        imports: {
            print_num: (arg : any) => {
                console.log("Logging from WASM: ", arg);
                display(String(arg));
                return arg;
            },
            print_bool: (arg : any) => {
                if(arg === 0) { display("False"); }
                else { display("True"); }
                return arg;
            },
            print_none: (arg: any) => {
                display("None");
                return arg;
            },
            print_char: (arg: any, lf: any) => {
                const output = document.getElementById("output");
                output.textContent += String.fromCharCode(arg);
                if (lf) output.textContent += "\n";
                // return arg;
            }
        },
        check: {
            check_init: (arg: any) => {
                if (arg === 0) {
                    throw new Error("RUNTIME ERROR: object not intialized");
                }
                return arg;
            },
            check_index: (length: any, arg: any) => {
                if (arg >= length || arg < 0) {
                    throw new Error("RUNTIME ERROR: Index out of bounds");
                }
                return arg;
            },
        },
    };
    const runButton = document.getElementById("run");
    const userCode = document.getElementById("user-code") as HTMLTextAreaElement;
    runButton.addEventListener("click", async () => {
        const program = userCode.value;
        const output = document.getElementById("output");
        try {
            const wat = compile(program);
            const code = document.getElementById("generated-code");
            code.textContent = wat;
            const result = await run(wat, importObject);
            output.textContent += String(result);
            output.setAttribute("style", "color: black");
        }
        catch(e) {
            console.error(e)
            output.textContent = String(e);
            output.setAttribute("style", "color: red");
        }
    });

    userCode.value = localStorage.getItem("program");
    userCode.addEventListener("keypress", async() => {
        localStorage.setItem("program", userCode.value);
    });
});