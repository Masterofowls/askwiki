import { add, divide, multiply, subtract } from "../math"

describe("math utilities", () => {
  describe("add", () => {
    it("adds two positive numbers", () => {
      expect(add(2, 3)).toBe(5)
    })

    it("adds a positive and a negative number", () => {
      expect(add(5, -3)).toBe(2)
    })

    it("adds zero", () => {
      expect(add(0, 0)).toBe(0)
    })
  })

  describe("subtract", () => {
    it("subtracts smaller from larger", () => {
      expect(subtract(5, 3)).toBe(2)
    })

    it("subtracts a negative number", () => {
      expect(subtract(5, -3)).toBe(8)
    })

    it("returns zero for equal numbers", () => {
      expect(subtract(3, 3)).toBe(0)
    })
  })

  describe("multiply", () => {
    it("multiplies two positive numbers", () => {
      expect(multiply(2, 3)).toBe(6)
    })

    it("multiplies by zero", () => {
      expect(multiply(5, 0)).toBe(0)
    })

    it("multiplies by a negative number", () => {
      expect(multiply(4, -2)).toBe(-8)
    })
  })

  describe("divide", () => {
    it("divides two positive numbers", () => {
      expect(divide(6, 3)).toBe(2)
    })

    it("throws on division by zero", () => {
      expect(() => divide(5, 0)).toThrow("Division by zero")
    })

    it("returns a decimal result", () => {
      expect(divide(1, 3)).toBeCloseTo(0.333, 3)
    })
  })
})
