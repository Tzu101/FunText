/**
 * @jest-environment jsdom
 */

import { FunText } from "../index";

/*beforeAll(() => {
  const element1 = document.createElement("div");
  element1.setAttribute("id", "funtext1");
  document.body.appendChild(element1);

  const element2 = document.createElement("div");
  element2.setAttribute("id", "funtext2");
  document.body.appendChild(element2);
});*/

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
  expect(funtext_letters.container.children.length).toBe("letters".length);

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
  expect(funtext_words.container.children.length).toBe(2);

  const funtext_custom = new FunText(
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
  expect(funtext_words.container.children.length).toBe(2);
});
