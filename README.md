# CSE 231 Compiler - Chocopy

## Project Milestone 2

- **Which features had interactions that you didn’t expect before you started implementing?**
  
  During implementation, we found that string and list had more interactions than we assumed they would have. They could share similar helper functions, for example, `concat`(concatenate two lists/strings together) and `copy`(make a copy of a list/string). If we design these functions carefully, those built-in functions can be applied to both lists and strings. However, there are different behaviors, like the index expression. For lists, we can directly return the element in the list based on the offset after checking the offset is valid. On the other hand, for strings, we create a copy of the expression in memory since the result is still a string and we need to make sure we can manipulate it later.

- **What feature are you most proud of in your implementation and why?**
  
  nested function, mainly because the nonlocal variable in the nested function is quite challenging to implement. We implemented this in multiple steps. 
  (1) We implemented the function lifting, which lifts all the functions into the global scope. We didn't consider closure and we need to rename the function to avoid name collision. 
  (2) We implemented the closure computation, in this step, we go through every statement in the function body and find all the names. If a name is used but not defined locally by parameters of the function or local variables then it is included in the closure. Then we add closure as parameters to the function and as arguments to all the calls to that function. We didn't consider the case that a function modifies a variable that is not defined locally or globally.
  (3) We implemented the reference variable capture, in this step, we go through every statement in the function body and find all the names that are local variables but referenced and modified in the inner function. Then we modify that local variables to be wrapped in a reference type, which means it will be allocated in the heap. And we need to change all the references of that variable to correctly refer to the new variable.
  After these steps, we completed the nested function implementation. This process is error-prone and breaking down the process into multiple steps helps us implement this functionality.

- **What features remain to implement?**
  
  Up till now, we basically covered everything in the Chocopy specifications. Also, we have passed a number of tests when developing each feature independently. We also need to test the combinations of features, such as classes with lists and strings, nested for loops and nested lists, etc. 

- **Is there anything you’re stuck on?**
  
  In our implementation of strings, we allocate memory on the heap whenever we encounter string literals. However, member variables in classes are also allocated continuously on the heap. We assumed each member variable occupies 4 bytes of memory and relied on it to calculate the offset of each variable. Therefore, if there are string member variables in a class, it will corrupt the offsets corresponding to each variable after strings. 
  
  To solve this problem, we filter all the string member variables, allocate them on the heap first and assign the address to local variables before generating codes for the class. When initializing string member variables, we assign the local variables (i.e. the addresses of pre-allocated strings) to the member variables, which avoids corrupting the offset table of the class.

- **Consider programs that work in Python, but not in ChocoPy, involving strings or lists. Pick one that you think would be a straightforward extension to your compiler – describe how you would implement it. Pick one that you think would be an extremely difficult extension to your compiler – describe why.**
  
  - a straightforward extension: we think list comprehension is a reasonable and straightforward extension, given now we have implemented the list and for-loop. List comprehension is to create a list based on existing lists. We can easily extend the current program. We need to add the comprehension syntax to the ast as a new expression and extend the parser and type checker. In the codegen phrase, we just create a new list, allocate the memory, compute each element in the for-loop and place them in the correct position in the list.
  
  - a hard extension: garbage collection. We first would need a memory allocator which keeps track of the free memory regions using a linked list. If we don't have a memory allocator, garbage collection would not make sense since we can not reuse the memory. 
  After we have a memory allocator, we would need to when a memory can be recycled, meaning no name is associated with it. To do this, we will try simple reference counting. We will add an extra reference counter at the beginning of every variable and we will insert the reference increase function at the variable creation and reference decrease and check statements at the end of the function. The reference increase and decrease function simply increases and decreases the reference counter when a variable is created and destroyed. The reference check function checks if the reference counter is 0. If so, it will recycle that memory region and add it to the linked list to be managed by the memory allocator.
  This is quite similar to the C++ RAII design. This is hard because (1) we need to change the layout of the variables (2) we need to add a lot of extra statements which are not written by the user into the programs and make sure the semantics is correct. (3) we need to add a memory allocator to manage the memory, which is not straightforward.