/**
 * @jest-environment jsdom
 */

import { FunText } from "../../index";

test("mount", () => {
  const original_text = "ORIGINAL";
  const animated_text = "ANIMATED";

  const element = document.createElement("div");
  element.innerText = original_text;

  const funtext = new FunText(element, [], {
    text: animated_text,
    openMode: true,
  });

  // Note: Real DOM does not return innerText when mounted but jest DOM does

  funtext.unmount();

  expect(element.innerText).toBe(original_text);
});
