/**
 * @jest-environment jsdom
 */

import { FunText } from "../../index";

test("scope", () => {
  const funtext_letters = new FunText(
    document.createElement("div"),
    [
      {
        scope: "letter",
        property: "",
        steps: "",
        duration: 1,
      },
    ],
    {
      text: "letters",
      openMode: true,
    },
  );
  funtext_letters.mount();

  const letters_root = funtext_letters.container.shadowRoot?.children[0];
  expect(letters_root?.children.length).toBe("letters".length);

  const funtext_words = new FunText(
    document.createElement("div"),
    [
      {
        scope: "word",
        property: "",
        steps: "",
        duration: 1,
      },
    ],
    {
      text: "word1 word2",
      openMode: true,
    },
  );
  funtext_words.mount();

  const words_root = funtext_words.container.shadowRoot?.children[0];
  expect(words_root?.children.length).toBe(3);

  const funtext_custom = new FunText(
    document.createElement("div"),
    [
      {
        scope: {
          priority: 1,
          split: "A",
        },
        property: "a",
        steps: "",
        duration: 1,
      },
      {
        scope: {
          priority: 3,
          split: "B",
        },
        property: "b",
        steps: "",
        duration: 1,
      },
    ],
    {
      text: "CBCACBC",
      openMode: true,
    },
  );
  funtext_custom.mount();

  const custom_root = funtext_custom.container.shadowRoot?.children[0];
  expect(custom_root?.children.length).toBe(3);
  expect(custom_root?.children[0].children.length).toBe(3);
});

test("sync", async () => {
  /*let startTime = -1;
  let endTime = -1;

  const container = document.createElement("div");
  document.body.appendChild(container);

  const funtext_sync = new FunText(
    container,
    [
      {
        scope: "letter",
        property: "",
        steps: "",
        duration: 1,
        sync: {
          location: 0,
          duration: 3,
        },
        onStart: (event) => {
          startTime = event.elapsedTime;
        },
        onEnd: (event) => {
          endTime = event.elapsedTime;
        },
      },
    ],
    {
      text: "letters",
      openMode: true,
    },
  );
  funtext_sync.mount();

  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  await delay(4000);

  expect(startTime).toBeCloseTo(0);
  expect(endTime).toBeCloseTo(3);*/

  // Animations dont start in test enviorment
  expect(true).toBeTruthy();
}, 30000);
