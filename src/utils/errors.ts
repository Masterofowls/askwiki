/**
 * Error helper — typed error classes and Zod validation utilities.
 *
 * Provides:
 * - Typed error hierarchy (AppError, NotFoundError, ValidationError)
 * - Zod schema wrapper for standardized validation
 * - Result type helpers for error-safe operations
 */

import { z } from "zod"

// ── Re-export Zod ──────────────────────────────────────────────

export { z }

// ── Typed Error Classes ────────────────────────────────────────

export class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details?: unknown

  constructor(message: string, code: string, statusCode = 500, details?: unknown) {
    super(message)
    this.name = "AppError"
    this.code = code
    this.statusCode = statusCode
    this.details = details

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, details?: unknown) {
    super(`${resource} not found`, "NOT_FOUND", 404, details)
    this.name = "NotFoundError"
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", 400, details)
    this.name = "ValidationError"
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "CONFIGURATION_ERROR", 500, details)
    this.name = "ConfigurationError"
  }
}

// ── Zod Schema Wrapper ─────────────────────────────────────────

export type InferOutput<T extends z.ZodType> = z.infer<T>
export type InferInput<T extends z.ZodSchema> = z.input<T>

export interface TypedSchema<T> {
  /** Parse input, throwing ValidationError on failure. */
  parse: (input: unknown) => T

  /** Safe parse returning a result object. */
  safeParse: (input: unknown) => z.ZodSafeParseResult<T>

  /** The underlying Zod schema. */
  schema: z.ZodType<T>
}

/**
 * Wrap a Zod schema with standardized error handling.
 *
 * ```ts
 * const UserSchema = createSchema(z.object({
 *   name: z.string().min(1),
 *   email: z.string().email(),
 * }))
 *
 * const user = UserSchema.parse(rawData) // throws ValidationError on failure
 * ```
 */
export function createSchema<T>(schema: z.ZodType<T>): TypedSchema<T> {
  return {
    parse: (input: unknown): T => {
      const result = schema.safeParse(input)
      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.issues)
      }
      return result.data
    },
    safeParse: schema.safeParse.bind(schema),
    schema,
  }
}

// ── Result Type ────────────────────────────────────────────────

export type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E }

/**
 * Execute a function that may throw, returning a Result type.
 *
 * ```ts
 * const result = tryCatch(() => riskyOperation())
 * if (!result.ok) {
 *   console.error(result.error.message)
 * }
 * ```
 */
export function tryCatch<T>(fn: () => T): Result<T, AppError> {
  try {
    return { ok: true, value: fn() }
  } catch (error) {
    const appError =
      error instanceof AppError
        ? error
        : new AppError(
            error instanceof Error ? error.message : "Unknown error",
            "UNKNOWN",
            500,
            error,
          )
    return { ok: false, error: appError }
  }
}

/**
 * Async version of tryCatch.
 */
export async function tryCatchAsync<T>(fn: () => Promise<T>): Promise<Result<T, AppError>> {
  try {
    const value = await fn()
    return { ok: true, value }
  } catch (error) {
    const appError =
      error instanceof AppError
        ? error
        : new AppError(
            error instanceof Error ? error.message : "Unknown error",
            "UNKNOWN",
            500,
            error,
          )
    return { ok: false, error: appError }
  }
}
