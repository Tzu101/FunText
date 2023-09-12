import type {
  Options,
  AnimationType,
  AnimationSteps,
  AnimationSync,
  Animation,
  CompiledAnimationSteps,
  CompiledAnimation,
  CompiledAnimations,
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
  private static readonly KEYFRAME = "funtext-keyframe";
  private static readonly CLASS = "funtext";
  private static readonly WORD_CLASS = "funtext__word";
  private static readonly LETTER_CLASS = "funtext__letter";
  private static readonly DIVIDER_CLASS = "funtext__divider";

  private static readonly DEFAULT_ANIMATION = {
    offset: 0.5,
    delay: 0,
    iteration: "1",
    direction: "normal",
    timing: "linear",
    fill: "none",
  };

  private static readonly ANIMATED_PROPERTY: {
    [key in AnimationType]: string;
  } = {
    horizontal: "translate",
    vertical: "translate",
    color: "color",
    background: "background-color",
    opacity: "opacity",
    scale: "scale",
    rotate: "rotate",
  };

  private static readonly ANIMATED_PROPERTY_DEFAULT: {
    [key in AnimationType]: string;
  } = {
    horizontal: "0",
    vertical: "0",
    color: "inherit",
    background: "inherit",
    opacity: "inherit",
    scale: "1",
    rotate: "0",
  };

  // UTILITY
  private static buildKeyframeStep(
    type: AnimationType,
    percent: number,
    value: string,
  ): string {
    return `${percent}% { ${FunText.ANIMATED_PROPERTY[type]}: ${value} }`;
  }

  private static buildKeyframes(
    names: string[],
    keyframeSteps: string[],
  ): string[] {
    const keyframes: string[] = [];

    for (let n = 0; n < names.length; n++) {
      keyframes.push(`@keyframes ${names[n]} { ${keyframeSteps.join("\n")} }`);
    }

    return keyframes;
  }

  private static compileSteps(steps: AnimationSteps): CompiledAnimationSteps {
    if (typeof steps === "string") {
      return {
        100: steps,
      };
    } else if (Array.isArray(steps)) {
      if (steps.length === 0) {
        return {};
      }

      const compiledSteps: CompiledAnimationSteps = {};
      const stepInterval = 100 / (steps.length - 1);

      for (let step = 0; step < steps.length; step++) {
        const stepPercentage = Math.min(step * stepInterval, 100);
        compiledSteps[stepPercentage] = steps[step];
      }

      return compiledSteps;
    }
    return { ...steps };
  }

  private static syncSteps(
    steps: CompiledAnimationSteps,
    sync: AnimationSync,
    duration: number,
    type: AnimationType,
  ): CompiledAnimationSteps {
    const durationRatio = duration / sync.duration;
    if (durationRatio >= 1) {
      return steps;
    }

    let syncLocation = 0;
    if (typeof sync.location === "number") {
      syncLocation = sync.location;

      const maxSyncLocation = 100 - 100 * (1 - durationRatio);
      syncLocation = Math.min(syncLocation, maxSyncLocation);
    } else {
      if (sync.location === "end") {
        const maxSyncLocation = 100 - 100 * (1 - durationRatio);
        syncLocation = maxSyncLocation;
      } else if (sync.location === "middle") {
        syncLocation = (100 * (1 - durationRatio)) / 2;
      } else {
        syncLocation = 0;
      }
    }

    const syncedSteps: CompiledAnimationSteps = {};
    let minStep = 100;
    let maxStep = 0;
    for (const stepPercent of Object.keys(steps)) {
      const stepPercentNum = Number(stepPercent);
      const syncedStepPercent =
        (stepPercentNum * duration) / sync.duration + syncLocation;
      syncedSteps[syncedStepPercent] = steps[stepPercentNum];

      minStep = Math.min(minStep, syncedStepPercent);
      maxStep = Math.max(maxStep, syncedStepPercent);
    }

    syncedSteps[minStep - 0.01] = FunText.ANIMATED_PROPERTY_DEFAULT[type];
    syncedSteps[maxStep + 0.01] = FunText.ANIMATED_PROPERTY_DEFAULT[type];

    return syncedSteps;
  }

  private static compileAnimation(animation: Animation): CompiledAnimation {
    let steps = FunText.compileSteps(animation.steps);
    console.log(steps);

    let duration = animation.duration;
    if (animation.sync) {
      steps = FunText.syncSteps(
        steps,
        animation.sync,
        duration,
        animation.type,
      );
      duration = animation.sync.duration;
      console.log(steps);
    }

    return {
      type: animation.type,
      steps,
      offset: animation.offset ?? FunText.DEFAULT_ANIMATION.offset,
      duration: duration,
      delay: animation.delay ?? FunText.DEFAULT_ANIMATION.delay,
      iteration:
        `${animation.iteration}` ?? FunText.DEFAULT_ANIMATION.iteration,
      direction: animation.direction ?? FunText.DEFAULT_ANIMATION.direction,
      timing: animation.timing ?? FunText.DEFAULT_ANIMATION.timing,
      fill: animation.fill ?? FunText.DEFAULT_ANIMATION.fill,
    };
  }

  private static compileAnimations(
    animations: Animation[],
  ): CompiledAnimations {
    const wordAnimatons: CompiledAnimation[] = [];
    const letterAnimatons: CompiledAnimation[] = [];

    for (const animation of animations) {
      const compiledAnimation = FunText.compileAnimation(animation);

      if (animation.scope === "word") {
        wordAnimatons.push(compiledAnimation);
      } else {
        letterAnimatons.push(compiledAnimation);
      }
    }

    return {
      word: wordAnimatons,
      letter: letterAnimatons,
    };
  }

  // CSS
  private static createStyle(
    html: HTMLElement,
    compiledAnimatons: CompiledAnimations,
  ): HTMLStyleElement {
    const wordKeyframeNames: string[] = [];
    const wordKeyframeSteps: string[] = [];
    const wordDuration: string[] = [];
    const wordDelay: string[] = [];
    const wordIteration: string[] = [];
    const wordDirection: string[] = [];
    const wordTiming: string[] = [];
    const wordFill: string[] = [];

    for (const wordAnimation of compiledAnimatons.word) {
      wordKeyframeNames.push(`${FunText.KEYFRAME}-${wordAnimation.type}`);

      let wordKeyframe = "";
      for (const stepPercent of Object.keys(wordAnimation.steps)) {
        const stepPercentNum = Number(stepPercent);
        const stepValue = wordAnimation.steps[stepPercentNum];
        wordKeyframe += FunText.buildKeyframeStep(
          wordAnimation.type,
          stepPercentNum,
          stepValue,
        );
      }
      wordKeyframeSteps.push(wordKeyframe);

      wordDuration.push(`${wordAnimation.duration}s`);
      wordDelay.push(
        `calc(${wordAnimation.delay}s + var(--offset-${wordAnimation.type}))`,
      );
      wordIteration.push(wordAnimation.iteration);
      wordDirection.push(wordAnimation.direction);
      wordTiming.push(wordAnimation.timing);
      wordFill.push(wordAnimation.fill);
    }

    const letterKeyframeNames: string[] = [];
    const letterKeyframeSteps: string[] = [];
    const letterDuration: string[] = [];
    const letterDelay: string[] = [];
    const letterIteration: string[] = [];
    const letterDirection: string[] = [];
    const letterTiming: string[] = [];
    const letterFill: string[] = [];

    for (const letterAnimation of compiledAnimatons.letter) {
      letterKeyframeNames.push(`${FunText.KEYFRAME}-${letterAnimation.type}`);

      let letterKeyframe = "";
      for (const stepPercent of Object.keys(letterAnimation.steps)) {
        const stepPercentNum = Number(stepPercent);
        const stepValue = letterAnimation.steps[stepPercentNum];
        letterKeyframe += FunText.buildKeyframeStep(
          letterAnimation.type,
          stepPercentNum,
          stepValue,
        );
      }
      letterKeyframeSteps.push(letterKeyframe);

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
      rotate: 0,
    };

    for (let wordIndex = 0; wordIndex < html.children.length; wordIndex++) {
      const word = html.children[wordIndex];
      const wordInlineStyle: string[] = [];

      for (const wordAnimation of compiledAnimatons.word) {
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

        for (const letterAnimation of compiledAnimatons.letter) {
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

      ${FunText.buildKeyframes(wordKeyframeNames, wordKeyframeSteps).join("\n")}
      ${FunText.buildKeyframes(letterKeyframeNames, letterKeyframeSteps).join(
        "\n",
      )}

      .${FunText.WORD_CLASS} {
        animation-name: ${wordKeyframeNames.join(",")};
        animation-duration: ${wordDuration.join(",")};
        animation-delay: ${wordDelay.join(",")};
        animation-iteration-count: ${wordIteration.join(",")};
        animation-direction: ${wordDirection.join(",")};
        animation-timing-function: ${wordTiming.join(",")};
        animation-fill-mode: ${wordFill.join(",")};
      }
      
      .${FunText.LETTER_CLASS} {
        animation-name: ${letterKeyframeNames.join(",")};
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

    const compiledAnimatons = FunText.compileAnimations(animations);

    this.html = FunText.createHtml(this.options?.text || container.innerText);
    this.style = FunText.createStyle(this.html, compiledAnimatons);
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
