
enum Type { Num, Bool, None, String }

function stringify(typ: Type, arg: any): string {
  switch (typ) {
    case Type.Num:
      return (arg as number).toString();
    case Type.Bool:
      return (arg as boolean) ? "True" : "False";
    case Type.None:
      return "None";
    case Type.String:
      return String.fromCharCode(arg);
  }
}

function print(typ: Type, arg: any, lf: boolean): any {
  importObject.output += stringify(typ, arg);
  if (lf) importObject.output += "\n";
  return arg;
}

export const importObject = {
  imports: {
    // we typically define print to mean logging to the console. To make testing
    // the compiler easier, we define print so it logs to a string object.
    //  We can then examine output to see what would have been printed in the
    //  console.
    print: (arg: any) => print(Type.Num, arg, true),
    print_num: (arg: number) => print(Type.Num, arg, true),
    print_bool: (arg: number) => print(Type.Bool, arg, true),
    print_none: (arg: number) => print(Type.None, arg, true),
    print_char: (arg: number, lf: number) => print(Type.String, arg, lf === 1),
    abs: Math.abs,
    min: Math.min,
    max: Math.max,
    pow: Math.pow,
  },

  output: "",
};
