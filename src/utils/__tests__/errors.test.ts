import {
  AppError,
  ConfigurationError,
  NotFoundError,
  ValidationError,
  createSchema,
  tryCatch,
  tryCatchAsync,
  z,
} from "../errors"

describe("AppError", () => {
  it("creates an error with code and statusCode", () => {
    const err = new AppError("Something went wrong", "TEST_ERROR", 400)
    expect(err.message).toBe("Something went wrong")
    expect(err.code).toBe("TEST_ERROR")
    expect(err.statusCode).toBe(400)
    expect(err.name).toBe("AppError")
  })

  it("defaults to statusCode 500", () => {
    const err = new AppError("msg", "CODE")
    expect(err.statusCode).toBe(500)
  })

  it("preserves instanceof across inheritance chain", () => {
    const err = new ValidationError("invalid")
    expect(err).toBeInstanceOf(ValidationError)
    expect(err).toBeInstanceOf(AppError)
    expect(err).toBeInstanceOf(Error)
  })
})

describe("NotFoundError", () => {
  it("formats message from resource name", () => {
    const err = new NotFoundError("User")
    expect(err.message).toBe("User not found")
    expect(err.code).toBe("NOT_FOUND")
    expect(err.statusCode).toBe(404)
  })
})

describe("ValidationError", () => {
  it("creates with defaults", () => {
    const err = new ValidationError("Bad input")
    expect(err.code).toBe("VALIDATION_ERROR")
    expect(err.statusCode).toBe(400)
  })
})

describe("ConfigurationError", () => {
  it("creates with defaults", () => {
    const err = new ConfigurationError("Missing API key")
    expect(err.code).toBe("CONFIGURATION_ERROR")
    expect(err.statusCode).toBe(500)
  })
})

describe("createSchema", () => {
  it("returns parsed data on valid input", () => {
    const schema = createSchema(z.object({ name: z.string(), age: z.number() }))
    const result = schema.parse({ name: "Alice", age: 30 })
    expect(result).toEqual({ name: "Alice", age: 30 })
  })

  it("throws ValidationError on invalid input", () => {
    const schema = createSchema(z.object({ name: z.string().min(1), email: z.string().email() }))
    expect(() => schema.parse({ name: "", email: "bad" })).toThrow(ValidationError)
  })

  it("includes Zod issues in error details", () => {
    const schema = createSchema(z.object({ name: z.string().min(1), email: z.string().email() }))
    try {
      schema.parse({ name: "", email: "bad" })
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      const details = (error as ValidationError).details as unknown[]
      expect(Array.isArray(details)).toBe(true)
    }
  })

  it("safeParse returns success result", () => {
    const schema = createSchema(z.string())
    const result = schema.safeParse("hello")
    expect(result.success).toBe(true)
  })

  it("safeParse returns failure result", () => {
    const schema = createSchema(z.number())
    const result = schema.safeParse("not a number")
    expect(result.success).toBe(false)
  })

  it("exposes the underlying schema", () => {
    const raw = z.string()
    const schema = createSchema(raw)
    expect(schema.schema).toBe(raw)
  })
})

describe("tryCatch", () => {
  it("returns ok for successful function", () => {
    const result = tryCatch(() => 42)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe(42)
    }
  })

  it("returns error for throwing function", () => {
    const result = tryCatch(() => {
      throw new Error("boom")
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(AppError)
      expect(result.error.message).toBe("boom")
    }
  })
})

describe("tryCatchAsync", () => {
  it("returns ok for successful async function", async () => {
    const result = await tryCatchAsync(async () => "value")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe("value")
    }
  })

  it("returns error for rejected async function", async () => {
    const result = await tryCatchAsync(async () => {
      throw new Error("async fail")
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toBe("async fail")
    }
  })
})
