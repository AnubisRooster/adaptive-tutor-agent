# Algorithms & Complexity

An **algorithm** is a finite, well-defined procedure for solving a problem. We care both about correctness and about how efficiently it uses time and memory.

## Big-O Notation

Big-O describes how running time grows as input size `n` grows, ignoring constants:
- `O(1)` constant — array index lookup.
- `O(log n)` logarithmic — binary search.
- `O(n)` linear — scanning a list once.
- `O(n log n)` — efficient sorting (merge sort, quicksort average).
- `O(n²)` quadratic — nested loops over the data (e.g., naive duplicate check).
- `O(2ⁿ)` exponential — brute-forcing all subsets; quickly infeasible.

Focus on the dominant term: `O(n² + n)` is just `O(n²)`.

## Searching

- **Linear search** checks each element: `O(n)`, works on any list.
- **Binary search** repeatedly halves a **sorted** list: `O(log n)`. It requires the data be sorted first.

## Sorting

- **Bubble/insertion sort**: simple, `O(n²)`, fine for tiny inputs.
- **Merge sort**: divide the list, sort halves, merge — stable `O(n log n)`.
- **Quicksort**: partition around a pivot; `O(n log n)` average, `O(n²)` worst case.

## Recursion

A function that calls itself on a smaller input. Every recursion needs a **base case** to stop, and each recursive call must move toward it. Example:

```js
function factorial(n) {
  if (n <= 1) return 1;      // base case
  return n * factorial(n - 1); // recursive step
}
```

## Choosing an Approach

Ask: how large is the input, and how often does this run? An `O(n²)` solution on 100 items is fine; on 10 million it is hopeless. Often the biggest speedups come from choosing the right **data structure** (e.g., a hash map for `O(1)` lookups) rather than micro-optimizing code.
