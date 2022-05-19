# CSE 231 Compiler - Chocopy

## Project Milestone 2

- **Which features had interactions that you didn’t expect before you started implementing?**
  
  During implementation, we found that string and list had more interactions than we assumed they would have. They could share similar helper functions, for example, `concat`(concatenate two lists/strings together) and `copy`(make a copy of a list/string). If we design these functions carefully, those built-in functions can be applied to both lists and strings. However, there are different behaviors, like the index expression. For lists, we can directly return the element in the list based on the offset after checking the offset is valid. On the other hand, for strings, we create a copy of the expression in memory since the result is still a string and we need to make sure we can manipulate it later.

- **What feature are you most proud of in your implementation and why?**
  
  nested function @KSB

- **What features remain to implement?**
  
  Up till now, we basically covered everything in the Chocopy specifications. Also, we have passed a number of tests when developing each feature independently. We also need to test the combinations of features, such as classes with lists and strings, nested  for loops and nested lists, etc. 

- **Is there anything you’re stuck on?**
  
  string in class, make global @XHF

- **Consider programs that work in Python, but not in ChocoPy, involving strings or lists. Pick one that you think would be a straightforward extension to your compiler – describe how you would implement it. Pick one that you think would be an extremely difficult extension to your compiler – describe why.**
  
  - a straightforward extension: we think list comprehension is a reasonable and straightforward extension, given now we have implemented the list and for-loop. List comprehension is to create a list based on existing lists. We can easily extend the current program. We need to add the comprehension syntax to the ast as a new expression and extend the parser and type checker. In the codegen phrase, we just create a new list, allocate the memory, compute each element in the for-loop and place them in the correct position in the list.
  
  - a hard extension: garbage collection.  @KSB