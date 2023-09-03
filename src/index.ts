type AnimationScope = "word" | "letter";
export type AnimationType =
  | "horizontal"
  | "vertical"
  | "color"
  | "background"
  | "opacity"
  | "scale"
  | "rotation";

interface Animation {
  scope: AnimationScope;
  type: AnimationType;
}

interface Options {
  text?: string;
}

export class FunText {
  private static readonly CLASS = "funtext";
  private static readonly WORD_CLASS = "funtext__word";
  private static readonly LETTER_CLASS = "funtext__letter";
  private static readonly DIVIDER_CLASS = "funtext__divider";

  private shadowRoot: ShadowRoot;

  private html: HTMLElement;
  private _text = "";
  set text(value: string) {
    this._text = value;

    const words = this._text.split(/(\s)/);
    for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
      const wordElement = document.createElement("div");

      if (wordIndex % 2 === 0) {
        wordElement.classList.add(FunText.CLASS);
        wordElement.classList.add(FunText.WORD_CLASS);
        const letters = words[wordIndex].split("");

        for (let letterIndex = 0; letterIndex < letters.length; letterIndex++) {
          const letterElement = document.createElement("p");

          letterElement.classList.add(FunText.CLASS);
          letterElement.classList.add(FunText.LETTER_CLASS);
          letterElement.innerText = letters[letterIndex];

          wordElement.appendChild(letterElement);
        }
      } else {
        wordElement.classList.add(FunText.CLASS);
        wordElement.classList.add(FunText.DIVIDER_CLASS);
        wordElement.innerText = words[wordIndex];
      }

      this.html.appendChild(wordElement);
    }
  }
  get text() {
    return this._text;
  }

  private style: HTMLStyleElement;
  private _animations: Animation[] = [];
  set animations(value: Animation[]) {
    this._animations = value;

    this.style.innerHTML = `

      .${FunText.WORD_CLASS} {
        background-color: blue;
      }
      
      .${FunText.LETTER_CLASS} {
        color: red;
      }

      .${FunText.DIVIDER_CLASS} {
        background-color: green;
      }

      .${FunText.CLASS} {
        display: inline;
        margin: 0;
        padding: 0;
      }
      `;
  }
  get animations() {
    return this._animations;
  }

  private _options: Options = {};
  set options(value: Options) {
    this._options = value;
  }
  get options() {
    return this._options;
  }

  constructor(
    container: HTMLElement,
    animations: Animation[],
    options?: Options,
  ) {
    this.shadowRoot = container.attachShadow({ mode: "closed" });

    this.options = options || {};
    console.log(options);

    this.html = document.createElement("div");
    this.text = this.options?.text || container.innerText;
    console.log(this.text);

    this.style = document.createElement("style");
    this.animations = animations;
  }

  mount() {
    this.shadowRoot.innerHTML = "";

    this.shadowRoot.appendChild(this.html);
    this.shadowRoot.appendChild(this.style);
  }

  unmount() {
    this.shadowRoot.innerHTML = "";

    this.shadowRoot.appendChild(document.createElement("slot"));
  }
}
