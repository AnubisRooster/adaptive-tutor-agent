# Foundations of AI

Artificial Intelligence is the study of building systems that perceive, reason, and act to achieve goals. A common framing is the **rational agent**: something that perceives its environment through sensors and acts through actuators to maximize a performance measure.

## Agents and Environments

- An **agent** maps perceptions (and history) to actions via an **agent function**.
- Environments vary: **fully vs. partially observable**, **deterministic vs. stochastic**, **static vs. dynamic**, **discrete vs. continuous**, and **single- vs. multi-agent**.
- **Rationality** means doing the action expected to maximize the performance measure given what the agent knows — not omniscience.

## Approaches Over Time

- **Symbolic / GOFAI**: knowledge as explicit rules and logic. Strong at reasoning, brittle with messy real-world data.
- **Search and optimization**: framing problems as finding paths or maxima in a space of possibilities.
- **Machine learning**: systems that improve from data rather than hand-coded rules. This paradigm now dominates, powered by large datasets and compute.

## Narrow vs. General

Today's systems are **narrow AI**: excellent at specific tasks (translation, image recognition, code completion). **Artificial general intelligence (AGI)** — broad, human-level competence across domains — remains hypothetical. Much public confusion comes from conflating impressive narrow performance with general understanding.

## Mechanism vs. Hype

A grounded mindset asks: what is the system actually optimizing, what data did it learn from, and where will it fail? Capabilities and limitations both follow from the training objective and data. Keeping this in mind separates genuine progress from marketing.
