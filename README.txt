1. (1) 1.1 + 1.1 gives a error. float is not supported. We can f64 type when generating the WASM code. 
(2) 4 / 2 gives a error. "/" is not supported yet. We can support "/" just like how we support "+ - *".
(3) max(1, 2, 3) gives a error. We only supported max functions with 2 arguments. We can
extend max function to arbitrary number of arguments.
2. TA's tutorial video, Typescript document, WASM document.
3. None