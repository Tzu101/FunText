import type {
  Options,
  InputOptions,
  InputAnimationType,
  InputAnimationSteps,
  InputAnimationSync,
  InputAnimation,
  AnimationType,
  AnimationSteps,
  Animation,
  ScopedAnimations,
  KeyframeAnimation,
} from "./types";

class FunTextCompiler {
  /* 
    OPTIONS
  */

  // CONSTANTS
  private static readonly DEFAULT_OPTIONS: Options = {
    text: "",
  };

  // MAIN
  static compileOptions(
    inputOptions: InputOptions | undefined,
    containerText: string,
  ): Options {
    const options = { ...FunTextCompiler.DEFAULT_OPTIONS };

    options.text = inputOptions?.text ?? containerText;

    return options;
  }

  /* 
    ANIMATIONS
  */

  //CONSTANTS
  private static readonly DEFAULT_ANIMATION: Animation = {
    type: "color",
    steps: {},
    duration: 1,

    delay: 0,
    iteration: "1",
    direction: "normal",
    timing: "linear",
    fill: "none",

    offset: 0.1,
  };

  // UTILITY
  private static compileType(type: InputAnimationType): AnimationType {
    return type;
  }

  private static compileSteps(steps: InputAnimationSteps): AnimationSteps {
    const compiledSteps: AnimationSteps = {};

    // Parameter steps is of type string
    if (typeof steps === "string") {
      compiledSteps[100] = steps;
      return compiledSteps;
    }

    // Parameter steps is of type array
    if (Array.isArray(steps)) {
      if (steps.length === 0) {
        return compiledSteps;
      }

      const stepInterval = 100 / (steps.length - 1);

      for (let step = 0; step < steps.length; step++) {
        const stepPercentage = Math.min(step * stepInterval, 100);
        compiledSteps[stepPercentage] = steps[step];
      }

      return compiledSteps;
    }

    // Parameter steps is of type object
    if (steps) {
      return { ...steps };
    }
    return compiledSteps;
  }

  private static syncSteps(
    steps: AnimationSteps,
    duration: number,
    sync?: InputAnimationSync,
  ): AnimationSteps {
    // Steps not defined
    if (!sync) {
      return steps;
    }

    // Sync smaller than actual duration
    const syncRatio = duration / sync.duration;
    if (syncRatio >= 1) {
      return steps;
    }

    // Determine sync location in percent
    let syncLocation = 0;
    switch (sync.location) {
      case "end":
        syncLocation = 100;
        break;
      case "middle":
        syncLocation = 50;
        break;
      case "start":
        syncLocation = 0;
        break;
      default:
        syncLocation = Math.max(Math.min(sync.location, 100), 0);
    }
    // Normalize sync location to the given sync
    syncLocation = syncLocation * syncRatio;

    const syncedSteps: AnimationSteps = {};
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

    // Indicate keyframes before and after sync need default value
    syncedSteps[minStep - 0.01] = null;
    syncedSteps[maxStep + 0.01] = null;

    // Indicate keyframes at the start and end need default value if they dont exist
    if (!syncedSteps[0]) {
      syncedSteps[0] = null;
    }
    if (!syncedSteps[100]) {
      syncedSteps[100] = null;
    }

    return syncedSteps;
  }

  private static compileDuration(
    duration: number,
    sync?: InputAnimationSync,
  ): number {
    if (!sync) {
      return duration;
    }

    if (sync.duration <= duration) {
      return duration;
    }

    return sync.duration;
  }

  private static compileAnimation(inputAnimation: InputAnimation): Animation {
    const type = FunTextCompiler.compileType(inputAnimation.type);
    let steps = FunTextCompiler.compileSteps(inputAnimation.steps);
    steps = FunTextCompiler.syncSteps(
      steps,
      inputAnimation.duration,
      inputAnimation.sync,
    );
    const duration = FunTextCompiler.compileDuration(
      inputAnimation.duration,
      inputAnimation.sync,
    );

    return {
      type,
      steps,
      duration,

      delay: inputAnimation.delay ?? FunTextCompiler.DEFAULT_ANIMATION.delay,
      iteration:
        `${inputAnimation.iteration}` ??
        FunTextCompiler.DEFAULT_ANIMATION.iteration,
      direction:
        inputAnimation.direction ?? FunTextCompiler.DEFAULT_ANIMATION.direction,
      timing: inputAnimation.timing ?? FunTextCompiler.DEFAULT_ANIMATION.timing,
      fill: inputAnimation.fill ?? FunTextCompiler.DEFAULT_ANIMATION.fill,

      offset: inputAnimation.offset ?? FunTextCompiler.DEFAULT_ANIMATION.offset,
    };
  }

  // MAIN
  static compileAnimations(
    inputAnimations: InputAnimation[],
  ): ScopedAnimations {
    const animations: ScopedAnimations = {
      word: [],
      letter: [],
    };

    for (const animation of inputAnimations) {
      const compiledAnimation = FunTextCompiler.compileAnimation(animation);

      if (animation.scope === "word") {
        animations.word.push(compiledAnimation);
      } else {
        animations.letter.push(compiledAnimation);
      }
    }

    return animations;
  }
}

class FunTextBuilder {
  /* 
		HTML
	*/

  // CONSTANTS
  private static readonly WORD_SPLIT = " ";
  private static readonly LETTER_SPLIT = "";

  private static readonly WORD_SCOPE = "word";
  private static readonly LETTER_SCOPE = "letter";

  private static readonly HTML_ELEMENT = "div";
  private static readonly WORD_ELEMENT = "div";
  private static readonly LETTER_ELEMENT = "p";
  private static readonly DIVIDER_ELEMENT = "p";

  // TODO: Root class, element class (funtext funtext__element funtext__element--word)
  private static readonly BASE_CLASS = "funtext";
  private static readonly WORD_CLASS = "funtext__word";
  private static readonly LETTER_CLASS = "funtext__letter";
  private static readonly DIVIDER_CLASS = "funtext__divider";

  // UTILITY
  private static buildDivider(): HTMLElement {
    const divider = document.createElement(FunTextBuilder.DIVIDER_ELEMENT);
    divider.classList.add(FunTextBuilder.BASE_CLASS);
    divider.classList.add(FunTextBuilder.DIVIDER_CLASS);

    return divider;
  }

  // MAIN
  static buildHtml(
    options: Options,
    animations: ScopedAnimations,
  ): HTMLElement {
    const html = document.createElement(FunTextBuilder.HTML_ELEMENT);

    // Element tree construction
    const words = options.text.split(FunTextBuilder.WORD_SPLIT);
    let letterCount = 0;
    for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
      // Empty word element means its a divider
      const letters = words[wordIndex].split(FunTextBuilder.LETTER_SPLIT);
      if (letters.length === 0) {
        const divider = FunTextBuilder.buildDivider();
        html.appendChild(divider);
        continue;
      }

      // Word element init
      const wordElement = document.createElement(FunTextBuilder.WORD_ELEMENT);
      wordElement.classList.add(FunTextBuilder.BASE_CLASS);
      wordElement.classList.add(FunTextBuilder.WORD_CLASS);

      // Word animation offset
      for (const wordAnimation of animations.word) {
        const animationName = `--offset-${FunTextBuilder.WORD_SCOPE}-${wordAnimation.type}`;
        const animationOffset = `${wordIndex * wordAnimation.offset}s`;
        wordElement.style.setProperty(animationName, animationOffset);
      }

      // Letter elements init
      for (let letterIndex = 0; letterIndex < letters.length; letterIndex++) {
        letterCount++;
        const letterElement = document.createElement(
          FunTextBuilder.LETTER_ELEMENT,
        );
        letterElement.classList.add(FunTextBuilder.BASE_CLASS);
        letterElement.classList.add(FunTextBuilder.LETTER_CLASS);
        letterElement.innerText = letters[letterIndex];

        // Letter animation offset
        for (const letterAnimation of animations.letter) {
          const animationName = `--offset-${FunTextBuilder.LETTER_SCOPE}-${letterAnimation.type}`;
          const animationOffset = `${letterCount * letterAnimation.offset}s`;
          letterElement.style.setProperty(animationName, animationOffset);
        }

        wordElement.appendChild(letterElement);
      }

      // Add divider than was lost during the split operation
      if (wordIndex < words.length - 1) {
        const divider = FunTextBuilder.buildDivider();
        divider.innerText = FunTextBuilder.WORD_SPLIT;
        wordElement.appendChild(divider);
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

  private static readonly DEFAULT_ANIMATION_PROPERTY: {
    [key in AnimationType]: string;
  } = {
    color: "inherit",
  };

  private static readonly DEFAULT_CSS = `
    display: inline;
    margin: 0;
    padding: 0;
  `;

  // UTILITY
  private static buildKeyframes(name: string, animation: Animation): string {
    let keyframes = "";

    for (const stepPercent of Object.keys(animation.steps)) {
      const stepValue = animation.steps[Number(stepPercent)];

      keyframes += `${stepPercent}% { ${animation.type}: ${
        stepValue ?? FunTextBuilder.DEFAULT_ANIMATION_PROPERTY[animation.type]
      } }`;
    }

    return `
      @keyframes ${name} {
        ${keyframes}
      }
    `;
  }

  private static buildAnimation(
    animation: Animation,
    scope: string,
  ): KeyframeAnimation {
    const name = `${FunTextBuilder.KEYFRAME}-${scope}-${animation.type}`;
    const keyframes = FunTextBuilder.buildKeyframes(name, animation);

    const duration = `${animation.duration}s`;
    const delay = `calc(${animation.delay}s + var(--offset-${scope}-${animation.type}))`;

    return {
      name,
      keyframes,
      duration,
      delay,
      iteration: animation.iteration,
      direction: animation.direction,
      timing: animation.timing,
      fill: animation.fill,
    };
  }

  private static joinValues<K extends keyof KeyframeAnimation>(
    attribute: K,
    animations: KeyframeAnimation[],
    separator: string,
  ): string {
    const values: string[] = [];

    for (const animation of animations) {
      values.push(animation[attribute]);
    }

    return values.join(separator);
  }

  // MAIN
  static buildStyle(animations: ScopedAnimations): HTMLStyleElement {
    const wordAnimations: KeyframeAnimation[] = [];
    const letterAnimations: KeyframeAnimation[] = [];

    for (const wordAnimation of animations.word) {
      wordAnimations.push(
        FunTextBuilder.buildAnimation(wordAnimation, FunTextBuilder.WORD_SCOPE),
      );
    }

    for (const letterAnimation of animations.letter) {
      letterAnimations.push(
        FunTextBuilder.buildAnimation(
          letterAnimation,
          FunTextBuilder.LETTER_SCOPE,
        ),
      );
    }

    const style = document.createElement("style");
    style.innerHTML = `
      ${FunTextBuilder.joinValues("keyframes", wordAnimations, "\n")}
      ${FunTextBuilder.joinValues("keyframes", letterAnimations, "\n")}

      .${FunTextBuilder.WORD_CLASS} {
        animation-name: ${FunTextBuilder.joinValues(
          "name",
          wordAnimations,
          ",",
        )};
        animation-duration: ${FunTextBuilder.joinValues(
          "duration",
          wordAnimations,
          ",",
        )};
        animation-delay: ${FunTextBuilder.joinValues(
          "delay",
          wordAnimations,
          ",",
        )};
        animation-iteration-count: ${FunTextBuilder.joinValues(
          "iteration",
          wordAnimations,
          ",",
        )};
        animation-direction: ${FunTextBuilder.joinValues(
          "direction",
          wordAnimations,
          ",",
        )};
        animation-timing-function: ${FunTextBuilder.joinValues(
          "timing",
          wordAnimations,
          ",",
        )};
        animation-fill-mode: ${FunTextBuilder.joinValues(
          "fill",
          wordAnimations,
          ",",
        )};
      }
      
      .${FunTextBuilder.LETTER_CLASS} {
        animation-name: ${FunTextBuilder.joinValues(
          "name",
          letterAnimations,
          ",",
        )};
        animation-duration: ${FunTextBuilder.joinValues(
          "duration",
          letterAnimations,
          ",",
        )};
        animation-delay: ${FunTextBuilder.joinValues(
          "delay",
          letterAnimations,
          ",",
        )};
        animation-iteration-count: ${FunTextBuilder.joinValues(
          "iteration",
          letterAnimations,
          ",",
        )};
        animation-direction: ${FunTextBuilder.joinValues(
          "direction",
          letterAnimations,
          ",",
        )};
        animation-timing-function: ${FunTextBuilder.joinValues(
          "timing",
          letterAnimations,
          ",",
        )};
        animation-fill-mode: ${FunTextBuilder.joinValues(
          "fill",
          letterAnimations,
          ",",
        )};
      }

      .${FunTextBuilder.DIVIDER_CLASS} {
        
      }

      .${FunTextBuilder.BASE_CLASS} {
        ${FunTextBuilder.DEFAULT_CSS}
      }
      `;
    return style;
  }
}

export class FunText {
  /*
    HTML
  */

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
    [key in InputAnimationType]: string;
  } = {
    color: "color",
  };

  private static readonly ANIMATED_PROPERTY_DEFAULT: {
    [key in InputAnimationType]: string;
  } = {
    color: "inherit",
  };

  // UTILITY
  private static buildKeyframeStep(
    type: InputAnimationType,
    percent: number,
    value: string | null,
  ): string {
    return `${percent}% { ${FunText.ANIMATED_PROPERTY[type]}: ${
      value ?? FunText.ANIMATED_PROPERTY_DEFAULT[type]
    } }`;
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

  // CSS
  private static createStyle(animations: ScopedAnimations): HTMLStyleElement {
    const wordKeyframeNames: string[] = [];
    const wordKeyframeSteps: string[] = [];
    const wordDuration: string[] = [];
    const wordDelay: string[] = [];
    const wordIteration: string[] = [];
    const wordDirection: string[] = [];
    const wordTiming: string[] = [];
    const wordFill: string[] = [];

    for (const wordAnimation of animations.word) {
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

    for (const letterAnimation of animations.letter) {
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

  /*
    LOGIC
  */

  private options: Options;
  private animations: ScopedAnimations;
  private html: HTMLElement;
  private style: HTMLStyleElement;
  private shadowRoot: ShadowRoot;

  constructor(
    container: HTMLElement,
    animations: InputAnimation[],
    options?: InputOptions,
  ) {
    this.options = FunTextCompiler.compileOptions(options, container.innerText);
    this.animations = FunTextCompiler.compileAnimations(animations);

    this.html = FunTextBuilder.buildHtml(this.options, this.animations);
    this.style = FunTextBuilder.buildStyle(this.animations);

    this.shadowRoot = container.attachShadow({ mode: "closed" });
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
