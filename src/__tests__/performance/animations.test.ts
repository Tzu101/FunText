/**
 * @jest-environment jsdom
 */

import { FunText, type InputAnimation } from "../../index";

const ITERATION_COUNT = 1000;
const ENVIORMENT_FACTOR = 5;

let funtext = null as unknown as FunText;
beforeAll(() => {
  const container = document.createElement("div");
  container.innerText = "Hello world, what a wonderfull day!";
  const animations: InputAnimation[] = [];
  const options = {};
  funtext = new FunText(container, animations, options);
  funtext.mount();
});

// Only one simple animation
test("animation simple", () => {
  const animations: InputAnimation[] = [
    {
      scope: "letter",
      property: "color",
      steps: "red",
      duration: 1,
    },
  ];

  const startTime = performance.now();
  for (let i = 0; i < ITERATION_COUNT; i++) {
    funtext.animations = animations;
  }
  const endTime = performance.now();

  const totalTime = endTime - startTime;
  const iterationTime = totalTime / ITERATION_COUNT;
  const balancedTime = iterationTime / ENVIORMENT_FACTOR;

  expect(balancedTime).toBeLessThan(1);
});

// Multiple simple animations
test("animations simple", () => {
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

  const startTime = performance.now();
  for (let i = 0; i < ITERATION_COUNT; i++) {
    funtext.animations = animations;
  }
  const endTime = performance.now();

  const totalTime = endTime - startTime;
  const iterationTime = totalTime / ITERATION_COUNT;
  const balancedTime = iterationTime / ENVIORMENT_FACTOR;

  expect(balancedTime).toBeLessThan(1);
});

// Using more complex steps
test("animations steps", () => {
  const animations: InputAnimation[] = [
    {
      scope: "letter",
      property: "color",
      steps: ["yellow", "red", "green", "blue"],
      duration: 1,
    },
    {
      scope: "letter",
      property: "opacity",
      steps: [0.9, 0.8, 0.7, 0],
      duration: 1,
    },
    {
      scope: "letter",
      property: "background",
      steps: ["blue", "green", "red", "yellow"],
      duration: 1,
    },
  ];

  const startTime = performance.now();
  for (let i = 0; i < ITERATION_COUNT; i++) {
    funtext.animations = animations;
  }
  const endTime = performance.now();

  const totalTime = endTime - startTime;
  const iterationTime = totalTime / ITERATION_COUNT;
  const balancedTime = iterationTime / ENVIORMENT_FACTOR;

  expect(balancedTime).toBeLessThan(1);
});

// Using sync
test("animations sync", () => {
  const animations: InputAnimation[] = [
    {
      scope: "letter",
      property: "color",
      steps: ["yellow", "red", "green", "blue"],
      duration: 1,
      sync: {
        location: 0,
        duration: 3,
      },
    },
    {
      scope: "letter",
      property: "opacity",
      steps: [0.9, 0.8, 0.7, 0],
      duration: 1,
      sync: {
        location: 50,
        duration: 3,
      },
    },
    {
      scope: "letter",
      property: "background",
      steps: ["blue", "green", "red", "yellow"],
      duration: 1,
      sync: {
        location: 100,
        duration: 3,
      },
    },
  ];

  const startTime = performance.now();
  for (let i = 0; i < ITERATION_COUNT; i++) {
    funtext.animations = animations;
  }
  const endTime = performance.now();

  const totalTime = endTime - startTime;
  const iterationTime = totalTime / ITERATION_COUNT;
  const balancedTime = iterationTime / ENVIORMENT_FACTOR;

  expect(balancedTime).toBeLessThan(1);
});

// Filter and transform animations
test("animations transform/filter", () => {
  const animations: InputAnimation[] = [
    {
      scope: "letter",
      property: "color",
      duration: 2,
      steps: "white",
      fill: "forwards",
      sync: {
        location: 0,
        duration: 5,
      },
    },
    {
      scope: "letter",
      type: "transform",
      animations: [
        {
          property: "translateY",
          duration: 3.5,
          delay: 1.5,
          unit: "px",
          steps: "-25",
        },
        {
          property: "translateX",
          duration: 3.5,
          delay: 1.5,
          unit: "px",
          steps: "-5",
        },
      ],
      fill: "forwards",
      offset: 0.1,
      delay: 0,
    },
    {
      scope: "letter",
      type: "filter",
      animations: [
        {
          property: "opacity",
          duration: 5,
          unit: "",
          steps: "0",
        },
        {
          property: "blur",
          duration: 5,
          unit: "px",
          steps: "10",
        },
      ],
      fill: "forwards",
      offset: 0.1,
      delay: 0,
    },
  ];

  const startTime = performance.now();
  for (let i = 0; i < ITERATION_COUNT; i++) {
    funtext.animations = animations;
  }
  const endTime = performance.now();

  const totalTime = endTime - startTime;
  const iterationTime = totalTime / ITERATION_COUNT;
  const balancedTime = iterationTime / ENVIORMENT_FACTOR;

  expect(balancedTime).toBeLessThan(1);
});
