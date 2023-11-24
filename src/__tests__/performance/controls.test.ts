/**
 * @jest-environment jsdom
 */

import { FunText, type InputAnimation } from "../../index";

const ITERATION_COUNT = 1000;
const ENVIORMENT_FACTOR = 10;

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

//Mount and unmount
test("controls mount", () => {
  const startTime = performance.now();
  for (let i = 0; i < ITERATION_COUNT; i++) {
    funtext.unmount();
    funtext.mount();
  }
  const endTime = performance.now();

  const totalTime = endTime - startTime;
  const iterationTime = totalTime / ITERATION_COUNT;
  const balancedTime = iterationTime / ENVIORMENT_FACTOR;

  expect(balancedTime).toBeLessThan(0.1);
});

// Play, pause and toggle
test("controls palystate", () => {
  const startTime = performance.now();
  for (let i = 0; i < ITERATION_COUNT; i++) {
    funtext.pauseAll();
    funtext.toggleAll();
    funtext.playAll();
  }
  const endTime = performance.now();

  const totalTime = endTime - startTime;
  const iterationTime = totalTime / ITERATION_COUNT;
  const balancedTime = iterationTime / ENVIORMENT_FACTOR;

  expect(balancedTime).toBeLessThan(0.1);
});

// Reset
test("controls reset", () => {
  const startTime = performance.now();
  for (let i = 0; i < ITERATION_COUNT; i++) {
    funtext.resetAll();
  }
  const endTime = performance.now();

  const totalTime = endTime - startTime;
  const iterationTime = totalTime / ITERATION_COUNT;
  const balancedTime = iterationTime / ENVIORMENT_FACTOR;

  expect(balancedTime).toBeLessThan(0.8);
});
