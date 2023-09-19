import type {
  Options,
  InputOptions,
  StringAnimationSteps,
  NumberAnimationSteps,
  DefaultAnimation,
  TransformAnimation,
  FilterAnimation,
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
  private static readonly DEFAULT_ANIMATION = {
    delay: 0,
    iteration: "1",
    direction: "normal",
    timing: "linear",
    fill: "none",

    offset: 0.1,
  };

  // UTILITY
  private static compileSteps(steps: StringAnimationSteps): AnimationSteps {
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

  private static compileAnimation(inputAnimation: DefaultAnimation): Animation {
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
      scope: inputAnimation.scope,
      type: inputAnimation.type ?? "default",
      property: inputAnimation.property,
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

  private static compileAnimationsToDefault(
    animations: TransformAnimation[] | FilterAnimation[],
  ): DefaultAnimation {
    return {
      scope: "letter",
      type: "default",
      property: "color",
      steps: "",

      duration: 1,
    };
  }

  // MAIN
  static compileAnimations(
    inputAnimations: InputAnimation[],
  ): ScopedAnimations {
    const defaultAnimations: DefaultAnimation[] = [];
    const transformAnimations: TransformAnimation[] = [];
    const filterAnimations: FilterAnimation[] = [];

    for (const animation of inputAnimations) {
      if (!animation.type || animation.type === "default") {
        defaultAnimations.push(animation);
      } else if (animation.type === "transform") {
        transformAnimations.push(animation);
      } else if (animation.type === "filter") {
        filterAnimations.push(animation);
      }
    }

    if (transformAnimations.length > 0) {
      // defaultAnimations.push(FunTextCompiler.compileAnimationsToDefault(transformAnimations))
    }

    if (filterAnimations.length > 0) {
      // defaultAnimations.push(FunTextCompiler.compileAnimationsToDefault(filterAnimations))
    }

    const animations: ScopedAnimations = {
      word: [],
      letter: [],
    };

    for (const animation of defaultAnimations) {
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

  private static readonly HTML_ELEMENT = "div";
  private static readonly WORD_ELEMENT = "div";
  private static readonly LETTER_ELEMENT = "p";
  private static readonly DIVIDER_ELEMENT = "p";

  // TODO: Root class, element class (funtext funtext__element funtext__element--word)
  private static readonly ELEMENT_CLASS = "funtext__element";
  private static readonly WORD_CLASS = `${this.ELEMENT_CLASS}--word`;
  private static readonly LETTER_CLASS = `${this.ELEMENT_CLASS}--letter`;
  private static readonly DIVIDER_CLASS = `${this.ELEMENT_CLASS}--divider`;

  // UTILITY
  private static buildDivider(): HTMLElement {
    const divider = document.createElement(FunTextBuilder.DIVIDER_ELEMENT);
    divider.classList.add(FunTextBuilder.ELEMENT_CLASS);
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
      wordElement.classList.add(FunTextBuilder.ELEMENT_CLASS);
      wordElement.classList.add(FunTextBuilder.WORD_CLASS);

      // Word animation offset
      for (const wordAnimation of animations.word) {
        const animationName = `--offset-${wordAnimation.scope}-${wordAnimation.property}`;
        const animationOffset = `${wordIndex * wordAnimation.offset}s`;
        wordElement.style.setProperty(animationName, animationOffset);
      }

      // Letter elements init
      for (let letterIndex = 0; letterIndex < letters.length; letterIndex++) {
        letterCount++;
        const letterElement = document.createElement(
          FunTextBuilder.LETTER_ELEMENT,
        );
        letterElement.classList.add(FunTextBuilder.ELEMENT_CLASS);
        letterElement.classList.add(FunTextBuilder.LETTER_CLASS);
        letterElement.innerText = letters[letterIndex];

        // Letter animation offset
        for (const letterAnimation of animations.letter) {
          const animationName = `--offset-${letterAnimation.scope}-${letterAnimation.property}`;
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

  private static readonly DEFAULT_PROPERTY_VALUE: {
    [key in AnimationType]: string;
  } = {
    default: "inherit",
    transform: "0",
    filter: "0",
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

      keyframes += `${stepPercent}% { ${animation.property}: ${
        stepValue ?? FunTextBuilder.DEFAULT_PROPERTY_VALUE[animation.type]
      } }`;
    }

    return `
      @keyframes ${name} {
        ${keyframes}
      }
    `;
  }

  private static buildAnimation(animation: Animation): KeyframeAnimation {
    const name = `${FunTextBuilder.KEYFRAME}-${animation.scope}-${animation.type}`;
    const keyframes = FunTextBuilder.buildKeyframes(name, animation);

    const duration = `${animation.duration}s`;
    const delay = `calc(${animation.delay}s + var(--offset-${animation.scope}-${animation.property}))`;

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
      wordAnimations.push(FunTextBuilder.buildAnimation(wordAnimation));
    }

    for (const letterAnimation of animations.letter) {
      letterAnimations.push(FunTextBuilder.buildAnimation(letterAnimation));
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

      .${FunTextBuilder.ELEMENT_CLASS} {
        ${FunTextBuilder.DEFAULT_CSS}
      }
      `;
    return style;
  }
}

export class FunText {
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
