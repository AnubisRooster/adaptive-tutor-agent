# Machine Learning

Machine learning (ML) builds models that improve at a task by learning patterns from data instead of being explicitly programmed with rules.

## Three Broad Types

- **Supervised learning**: learn a mapping from inputs to labeled outputs (e.g., emails → spam/not-spam). Includes **classification** (discrete labels) and **regression** (continuous values).
- **Unsupervised learning**: find structure in unlabeled data (clustering, dimensionality reduction).
- **Reinforcement learning**: an agent learns by trial and error, receiving rewards for good actions.

## The Core Loop

1. Choose a model with adjustable **parameters** (weights).
2. Define a **loss function** measuring how wrong predictions are.
3. Use an optimizer (often **gradient descent**) to adjust parameters to reduce loss on **training data**.
4. Evaluate on held-out **test data** to estimate real-world performance.

## Generalization: The Central Challenge

The goal is performance on *unseen* data, not memorization.
- **Overfitting**: the model fits noise in the training data and fails to generalize (low training error, high test error). Countered with more data, simpler models, and **regularization**.
- **Underfitting**: the model is too simple to capture the pattern (high error everywhere).
- The **bias–variance tradeoff** describes this balance: too simple → high bias; too flexible → high variance.

## Data Splits and Leakage

Always separate **train / validation / test** sets. The validation set tunes choices like model size; the test set is touched only once at the end. **Data leakage** — letting test information influence training — produces deceptively good scores that collapse in deployment.

## Why Evaluation Matters

A single accuracy number can mislead, especially with imbalanced classes. Use metrics suited to the problem (precision, recall, F1, calibration) and always ask what errors cost in the real application.
