import type {
  Options,
  AnimationType,
  Animation,
  CompiledAnimation,
} from "./types";

export class FunText {
  /*
    HTML
  */

  private static createHtml(text: string): HTMLElement {
    const html = document.createElement("div");
    const words = text.split(/(\s)/);

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

      html.appendChild(wordElement);
    }

    return html;
  }

  /*
    STYLE
  */

  // CONSTANTS
  private static readonly CLASS = "funtext";
  private static readonly WORD_CLASS = "funtext__word";
  private static readonly WORD_KEYFRAME = "funtext-word-keyframes";
  private static readonly LETTER_CLASS = "funtext__letter";
  private static readonly LETTER_KEYFRAME = "funtext-letter-keyframes";
  private static readonly DIVIDER_CLASS = "funtext__divider";

  private static readonly DEFAULT_ANIMATION = {
    offset: 0.5,
    duration: 1,
    delay: 0,
    iteration: "1",
    direction: "normal",
    timing: "linear",
    fill: "none",
  };

  private static readonly ANIMATION_TYPE_TARGET = {
    color: "color",
    opacity: "opacity",
  };

  // UTILITY
  private static getAnimatedProperty(type: string): string {
    switch (type) {
      case "color":
        return "color";
      case "opacity":
        return "opacity";
      default:
        return "none";
    }
  }

  private static getKeyframeStep(type: string, step: string): string {
    return `${FunText.getAnimatedProperty(type)}: ${step}`;
  }

  private static compileAnimation(animation: Animation): CompiledAnimation {
    return {
      scope: animation.scope,
      type: animation.type,
      steps: animation.steps,
      offset: animation.offset ?? FunText.DEFAULT_ANIMATION.offset,
      duration: animation.duration ?? FunText.DEFAULT_ANIMATION.duration,
      delay: animation.delay ?? FunText.DEFAULT_ANIMATION.delay,
      iteration:
        `${animation.iteration}` ?? FunText.DEFAULT_ANIMATION.iteration,
      direction: animation.direction ?? FunText.DEFAULT_ANIMATION.direction,
      timing: animation.timing ?? FunText.DEFAULT_ANIMATION.timing,
      fill: animation.fill ?? FunText.DEFAULT_ANIMATION.fill,
    };
  }

  // CSS
  private static createStyle(
    html: HTMLElement,
    animations: Animation[],
  ): HTMLStyleElement {
    const wordAnimations: CompiledAnimation[] = [];
    const letterAnimations: CompiledAnimation[] = [];
    for (const animation of animations) {
      if (animation.scope === "word") {
        wordAnimations.push(FunText.compileAnimation(animation));
      } else {
        letterAnimations.push(FunText.compileAnimation(animation));
      }
    }

    const wordFrom: string[] = [];
    const wordTo: string[] = [];
    const wordDuration: string[] = [];
    const wordDelay: string[] = [];
    const wordIteration: string[] = [];
    const wordDirection: string[] = [];
    const wordTiming: string[] = [];
    const wordFill: string[] = [];

    for (const wordAnimation of wordAnimations) {
      wordFrom.push(
        FunText.getKeyframeStep(wordAnimation.type, wordAnimation.steps[0]),
      );
      wordTo.push(
        FunText.getKeyframeStep(wordAnimation.type, wordAnimation.steps[1]),
      );
      wordDuration.push(`${wordAnimation.duration}s`);
      wordDelay.push(`${wordAnimation.delay}s`);
      wordIteration.push(wordAnimation.iteration);
      wordDirection.push(wordAnimation.direction);
      wordTiming.push(wordAnimation.timing);
      wordFill.push(wordAnimation.fill);
    }

    const letterFrom: string[] = [];
    const letterTo: string[] = [];
    const letterDuration: string[] = [];
    const letterDelay: string[] = [];
    const letterIteration: string[] = [];
    const letterDirection: string[] = [];
    const letterTiming: string[] = [];
    const letterFill: string[] = [];

    for (const letterAnimation of letterAnimations) {
      letterFrom.push(
        FunText.getKeyframeStep(letterAnimation.type, letterAnimation.steps[0]),
      );
      letterTo.push(
        FunText.getKeyframeStep(letterAnimation.type, letterAnimation.steps[1]),
      );
      letterDuration.push(`${letterAnimation.duration}s`);
      letterDelay.push(
        `calc(${letterAnimation.delay}s + var(--offset-${letterAnimation.type}))`,
      );
      letterIteration.push(letterAnimation.iteration);
      letterDirection.push(letterAnimation.direction);
      letterTiming.push(letterAnimation.timing);
      letterFill.push(letterAnimation.fill);
    }

    const animationOffset: { [key in AnimationType]: number } = {
      horizontal: 0,
      vertical: 0,
      color: 0,
      background: 0,
      opacity: 0,
      scale: 0,
      rotation: 0,
    };

    for (let wordIndex = 0; wordIndex < html.children.length; wordIndex++) {
      const word = html.children[wordIndex];
      const wordInlineStyle: string[] = [];

      for (const wordAnimation of wordAnimations) {
        wordInlineStyle.push(
          `--offset-${wordAnimation.type}: ${
            animationOffset[wordAnimation.type]
          }s`,
        );
        animationOffset[wordAnimation.type] += wordAnimation.offset;
      }

      word.setAttribute("style", wordInlineStyle.join(";"));

      for (
        let letterIndex = 0;
        letterIndex < word.children.length;
        letterIndex++
      ) {
        const letter = word.children[letterIndex];
        const letterInlineStyle: string[] = [];

        for (const letterAnimation of letterAnimations) {
          letterInlineStyle.push(
            `--offset-${letterAnimation.type}: ${
              animationOffset[letterAnimation.type]
            }s`,
          );
          animationOffset[letterAnimation.type] += letterAnimation.offset;
        }

        letter.setAttribute("style", letterInlineStyle.join(";"));
      }
    }

    const style = document.createElement("style");
    style.innerHTML = `

      @keyframes ${FunText.WORD_KEYFRAME} {
        from {
          ${wordFrom.join(";")};
        }
        to {
          ${wordTo.join(";")};
        }
      }

      @keyframes ${FunText.LETTER_KEYFRAME} {
        from {
          ${letterFrom.join(";")};
        }
        to {
          ${letterTo.join(";")};
        }
      }

      .${FunText.WORD_CLASS} {
        animation-name: ${FunText.WORD_KEYFRAME};
        animation-duration: ${wordDuration.join(",")};
        animation-delay: ${wordDelay.join(",")};
        animation-iteration-count: ${wordIteration.join(",")};
        animation-direction: ${wordDirection.join(",")};
        animation-timing-function: ${wordTiming.join(",")};
        animation-fill-mode: ${wordFill.join(",")};
      }
      
      .${FunText.LETTER_CLASS} {
        animation-name: ${FunText.LETTER_KEYFRAME};
        animation-duration: ${letterDuration.join(",")};
        animation-delay: ${letterDelay.join(",")};
        animation-iteration-count: ${letterIteration.join(",")};
        animation-direction: ${letterDirection.join(",")};
        animation-timing-function: ${letterTiming.join(",")};
        animation-fill-mode: ${letterFill.join(",")};
      }

      .${FunText.DIVIDER_CLASS} {
        
      }

      .${FunText.CLASS} {
        display: inline;
        margin: 0;
        padding: 0;
      }
      `;

    return style;
  }

  private shadowRoot: ShadowRoot;
  private options: Options;
  private html: HTMLElement;
  private style: HTMLStyleElement;

  constructor(
    container: HTMLElement,
    animations: Animation[],
    options?: Options,
  ) {
    this.shadowRoot = container.attachShadow({ mode: "closed" });

    this.options = options || {};

    this.html = FunText.createHtml(this.options?.text || container.innerText);
    this.style = FunText.createStyle(this.html, animations);
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

  // animation-play-state
}
