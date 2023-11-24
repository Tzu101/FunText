/**
 * @jest-environment jsdom
 */

import { FunText, type InputOptions, type InputAnimation } from "../../index";

const ITERATION_COUNT = 10;
const ENVIORMENT_FACTOR = 15;

let funtext = null as unknown as FunText;
beforeAll(() => {
  const container = document.createElement("div");
  container.innerText = "Hello world, what a wonderfull day!";
  const animations: InputAnimation[] = [
    {
      scope: "letter",
      property: "color",
      steps: "red",
      duration: 1,
    },
    {
      scope: "letter",
      property: "opacity",
      steps: "0",
      duration: 1,
    },
    {
      scope: "letter",
      property: "background",
      steps: "blue",
      duration: 1,
    },
  ];
  const options = {};
  funtext = new FunText(container, animations, options);
  funtext.mount();
});

// 100 Character string
test("options text size", () => {
  const options: InputOptions = {
    text: "0123456789",
  };
  for (let i = 0; i < 100; i++) {
    options.text += "0123456789";
  }

  const startTime = performance.now();
  for (let i = 0; i < ITERATION_COUNT; i++) {
    funtext.options = options;
  }
  const endTime = performance.now();

  const totalTime = endTime - startTime;
  const iterationTime = totalTime / ITERATION_COUNT;
  const balancedTime = iterationTime / ENVIORMENT_FACTOR;

  expect(balancedTime).toBeLessThan(15);
});
