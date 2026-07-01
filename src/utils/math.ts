/**
 * Core math utilities.
 *
 * @module math
 */

/** Supported arithmetic operations. */
export type MathOperation = "add" | "subtract" | "multiply" | "divide"

/**
 * Adds two numbers.
 *
 * @example
 * add(2, 3) // => 5
 */
export function add(a: number, b: number): number {
  return a + b
}

/**
 * Subtracts `b` from `a`.
 *
 * @example
 * subtract(5, 3) // => 2
 */
export function subtract(a: number, b: number): number {
  return a - b
}

/**
 * Multiplies two numbers.
 *
 * @example
 * multiply(2, 3) // => 6
 */
export function multiply(a: number, b: number): number {
  return a * b
}

/**
 * Divides `a` by `b`.
 *
 * @throws {Error} If `b` is zero.
 * @example
 * divide(6, 3) // => 2
 */
export function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error("Division by zero is not allowed")
  }
  return a / b
}
