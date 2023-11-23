/**
 * @jest-environment jsdom
 */

import { FunText } from "../../index";

test("text", () => {
  const original_text = "ORIGINAL";
  const funtext_text = "FUNTEXT";

  const element = document.createElement("div");
  element.innerText = original_text;

  const funtext = new FunText(element, [], {
    text: funtext_text,
    openMode: true,
  });
  funtext.mount();

  const funtext_root = funtext.container.shadowRoot?.children[0] as HTMLElement;
  expect(funtext_root?.innerText).toBe(funtext_text);
});

test("tags", () => {
  const text_tag = "span";
  const container_tag = "section";

  const funtext = new FunText(
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
      text: "Test",
      tags: {
        text: text_tag,
        container: container_tag,
      },
      openMode: true,
    },
  );
  funtext.mount();

  const funtext_root = funtext.container.shadowRoot?.children[0] as HTMLElement;
  expect(funtext_root?.tagName).toBe(container_tag.toUpperCase());
  expect(funtext_root?.children[0].tagName).toBe(text_tag.toUpperCase());
});

test("attributes", () => {
  const funtext = new FunText(document.createElement("div"), [], {
    attributes: {
      test1: "test1",
      test2: "test2",
    },
    openMode: true,
  });
  funtext.mount();

  const funtext_root = funtext.container.shadowRoot?.children[0] as HTMLElement;
  expect(funtext_root?.getAttribute("test1")).toBe("test1");
  expect(funtext_root?.getAttribute("test2")).toBe("test2");
});

test("accessibility", () => {
  const funtext = new FunText(document.createElement("div"), [], {
    text: "Aria",
    accessibility: {
      aria: true,
    },
    openMode: true,
  });
  funtext.mount();

  const funtext_aria = funtext.container.shadowRoot?.children[1];
  expect(funtext_aria?.getAttribute("aria-label")).toBe("Aria");
});
