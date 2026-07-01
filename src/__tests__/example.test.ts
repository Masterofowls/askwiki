import { add, divide, multiply, subtract } from "../index"

describe("public API", () => {
  it("exports add", () => {
    expect(add(1, 2)).toBe(3)
  })

  it("exports subtract", () => {
    expect(subtract(5, 3)).toBe(2)
  })

  it("exports multiply", () => {
    expect(multiply(3, 4)).toBe(12)
  })

  it("exports divide", () => {
    expect(divide(10, 2)).toBe(5)
  })
})
