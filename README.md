# CSE 231 Compiler - Chocopy

## Project Milestone 2

- **Which features had interactions that you didn’t expect before you started implementing?**
  
  During implementation, we found that string and list had more interactions than we assumed they would have. They could share similar helper functions, for example, `concat`(concatenate two lists/strings together) and `copy`(make a copy of a list/string). If we design these functions carefully, those built-in functions can be applied to both lists and strings. However, there are different behaviors, like the index expression. For lists, we can directly return the element in the list based on the offset after checking the offset is valid. On the other hand, for strings, we create a copy of the expression in memory since the result is still a string and we need to make sure we can manipulate it later.

- **What feature are you most proud of in your implementation and why?**
  
  nested function @KSB

- **What features remain to implement?**
  
  Up till now, we basically covered everything in the Chocopy specifications. Also, we have passed a number of tests when developing each feature independently. We also need to test the combinations of features, such as classes with lists and strings, nested  for loops and nested lists, etc. 

- **Is there anything you’re stuck on?**
  
  In our implementation of strings, we allocate memory on the heap whenever we encounter string literals. However, member variables in classes are also allocated continuously on the heap. We assumed each member variable occupies 4 bytes of memory and relied on it to calculate the offset of each variable. Therefore, if there are string member variables in a class, it will corrupt the offsets corresponding to each variable after strings. 
  
  To solve this problem, we filter all the string member variables, allocate them on the heap first and assign the address to local variables before generating codes for the class. When initializing string member variables, we assign the local variables (i.e. the addresses of pre-allocated strings) to the member variables, which avoids corrupting the offset table of the class.

- **Consider programs that work in Python, but not in ChocoPy, involving strings or lists. Pick one that you think would be a straightforward extension to your compiler – describe how you would implement it. Pick one that you think would be an extremely difficult extension to your compiler – describe why.**
  
  - a straightforward extension: we think list comprehension is a reasonable and straightforward extension, given now we have implemented the list and for-loop. List comprehension is to create a list based on existing lists. We can easily extend the current program. We need to add the comprehension syntax to the ast as a new expression and extend the parser and type checker. In the codegen phrase, we just create a new list, allocate the memory, compute each element in the for-loop and place them in the correct position in the list.
  
  - a hard extension: garbage collection.  @KSB