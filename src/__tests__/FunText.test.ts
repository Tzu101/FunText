import { FunText } from "../index";

test("FunText init", () => {
  expect(new FunText("Test").go()).toBe("FunText: Test");
});
