export class ParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ParseError";
    }
}

export class ReferenceError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ReferenceError";
    }
}

export class TypeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "TypeError";
        this.message = "TYPE ERROR: " + this.message;
    }
}