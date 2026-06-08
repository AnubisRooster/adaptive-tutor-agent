# Classical Mechanics

Mechanics describes how objects move and why. Start with **kinematics** (describing motion) and then **dynamics** (the causes of motion).

## Kinematics

For motion with constant acceleration `a`:
- `v = v0 + a*t`
- `x = x0 + v0*t + 0.5*a*t^2`
- `v^2 = v0^2 + 2*a*(x - x0)`

Velocity is the rate of change of position; acceleration is the rate of change of velocity. Always track **units** (meters, seconds) and **direction** — these are vector quantities.

## Newton's Laws

1. **Inertia**: an object keeps its velocity unless a net force acts on it.
2. **F = m·a**: the net force on an object equals its mass times its acceleration. Force and acceleration point the same direction.
3. **Action–reaction**: forces come in equal and opposite pairs acting on *different* objects.

## Problem-Solving Strategy

1. Draw a **free-body diagram**: represent the object as a point and draw every force as an arrow (gravity, normal, friction, tension, applied).
2. Choose axes (often align one with the motion or the incline).
3. Write `ΣF = m·a` for each axis separately.
4. Solve algebraically, *then* substitute numbers.
5. **Sanity-check**: are the units right? Is the magnitude plausible?

## Common Forces

- **Weight**: `W = m·g`, with `g ≈ 9.8 m/s²` near Earth's surface, pointing down.
- **Normal force**: perpendicular to a surface; it adjusts to prevent interpenetration, it is not always equal to weight.
- **Friction**: `f ≤ μ·N`, opposing relative motion or its tendency.

## Why Estimation Helps

Before computing, estimate the order of magnitude. If a ball dropped from a table "should" hit the floor in well under a second, an answer of 12 seconds signals an error. Building this intuition is as important as the algebra.
