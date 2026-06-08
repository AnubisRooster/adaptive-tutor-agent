# Programming Basics

Programming is instructing a computer to transform inputs into outputs through precise, unambiguous steps.

## Values, Types, and Variables

- A **value** is a piece of data: a number, text (**string**), boolean (`true`/`false`), or a collection.
- A **type** classifies values and the operations allowed on them. Mixing types incorrectly (adding a number to text) is a common bug.
- A **variable** is a named box holding a value: `let count = 0;`. Naming things clearly is a core skill — code is read far more often than written.

## Control Flow

Programs decide and repeat:

```js
if (score >= 60) {
  console.log("pass");
} else {
  console.log("try again");
}

for (let i = 0; i < 3; i++) {
  console.log(i); // 0, 1, 2
}
```

- **Conditionals** (`if/else`, `switch`) choose between paths.
- **Loops** (`for`, `while`) repeat work. Watch for **off-by-one** errors and infinite loops (a condition that never becomes false).

## Functions

A **function** packages a reusable step with inputs (**parameters**) and an output (**return value**):

```js
function area(width, height) {
  return width * height;
}
const a = area(3, 4); // 12
```

Functions make code readable, testable, and DRY (Don't Repeat Yourself). Aim for small functions that do one thing.

## A Productive Mindset

- **Decompose**: break a big task into small, solvable steps.
- **Predict, then run**: guess what a snippet outputs before executing it; mismatches teach you the most.
- **Read errors carefully**: the message and line number usually point near the problem.
- **Iterate**: write a little, run it, confirm it works, then continue. Small steps beat large leaps.
