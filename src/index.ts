import type {
  Options,
  InputOptions,
  InputAnimationSteps,
  DefaultAnimation,
  TransformAnimations,
  FilterAnimations,
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
  private static compileSteps(steps: InputAnimationSteps): AnimationSteps {
    const compiledSteps: AnimationSteps = {};

    // Parameter steps is of type string
    if (typeof steps === "string" || typeof steps === "number") {
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
    fill?: string,
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
    if (minStep !== maxStep) {
      if (fill === "backwards" || fill === "both") {
        syncedSteps[minStep - 0.01] = syncedSteps[minStep];
      } else {
        syncedSteps[minStep - 0.01] = null;
      }
    }

    if (fill === "forwards" || fill === "both") {
      syncedSteps[maxStep + 0.01] = syncedSteps[maxStep];
    } else {
      syncedSteps[maxStep + 0.01] = null;
    }

    // Indicate keyframes at the start and end need default value if they dont exist
    if (!syncedSteps[0]) {
      if (fill === "backwards" || fill === "both") {
        syncedSteps[0] = syncedSteps[minStep];
      } else {
        syncedSteps[0] = null;
      }
    }
    if (!syncedSteps[100]) {
      if (fill === "forwards" || fill === "both") {
        syncedSteps[100] = syncedSteps[maxStep];
      } else {
        syncedSteps[100] = null;
      }
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

  private static compileAnimation(animation: DefaultAnimation): Animation {
    let steps = FunTextCompiler.compileSteps(animation.steps);
    steps = FunTextCompiler.syncSteps(
      steps,
      animation.duration,
      animation.sync,
      animation.fill,
    );
    const duration = FunTextCompiler.compileDuration(
      animation.duration,
      animation.sync,
    );

    return {
      scope: animation.scope,
      type: animation.type ?? "default",
      property: animation.property,
      steps,
      duration,

      delay: animation.delay ?? FunTextCompiler.DEFAULT_ANIMATION.delay,
      iteration:
        `${animation.iteration}` ?? FunTextCompiler.DEFAULT_ANIMATION.iteration,
      direction:
        animation.direction ?? FunTextCompiler.DEFAULT_ANIMATION.direction,
      timing: animation.timing ?? FunTextCompiler.DEFAULT_ANIMATION.timing,
      fill: animation.fill ?? FunTextCompiler.DEFAULT_ANIMATION.fill,

      offset: animation.offset ?? FunTextCompiler.DEFAULT_ANIMATION.offset,
    };
  }

  private static mergeAnimations(
    animations: TransformAnimations | FilterAnimations,
  ): Animation {
    let maxLateness = 0;
    const compiledSteps: AnimationSteps[] = [];

    for (const animation of animations.animations) {
      const lateness = animation.duration + (animation.delay ?? 0);

      if (maxLateness < lateness) {
        maxLateness = lateness;
      }

      compiledSteps.push(FunTextCompiler.compileSteps(animation.steps));
    }

    const allFramesSet = new Set<number>();
    for (let s = 0; s < compiledSteps.length; s++) {
      const animation = animations.animations[s];

      const delayFrame = ((animation.delay ?? 0) / maxLateness) * 100;
      const durationRatio = animation.duration / maxLateness;

      const syncedSteps: AnimationSteps = {};
      const frames = Object.keys(compiledSteps[s]).map((f) => Number(f));
      for (const frame of frames) {
        const syncedFrame = frame * durationRatio + delayFrame;
        syncedSteps[syncedFrame] = compiledSteps[s][frame];
        allFramesSet.add(syncedFrame);
      }

      compiledSteps[s] = syncedSteps;
    }

    const allFramesList = Array.from(allFramesSet);
    for (let s = 0; s < compiledSteps.length; s++) {
      const compiledStep = compiledSteps[s];
      const stepFrames = Object.keys(compiledStep).map((f) => Number(f));

      for (const frame of Array.from(allFramesList)) {
        if (compiledStep[frame]) {
          continue;
        }

        let lowerDiff = Number.MAX_SAFE_INTEGER;
        let higherDiff = Number.MAX_SAFE_INTEGER;
        let closestLower: number | null = null;
        let closestHigher: number | null = null;

        for (const stepFrame of stepFrames) {
          if (stepFrame < frame) {
            const diff = frame - stepFrame;

            if (lowerDiff > diff) {
              lowerDiff = diff;
              closestLower = stepFrame;
            }
          } else {
            const diff = stepFrame - frame;

            if (higherDiff > diff) {
              higherDiff = diff;
              closestHigher = stepFrame;
            }
          }
        }

        let lowerValue = 0;
        if (closestLower) {
          lowerValue = Number(compiledStep[closestLower] ?? 0);
        } else {
          closestLower = 0;
        }

        let higherValue = 0;
        if (closestHigher) {
          higherValue = Number(compiledStep[closestHigher] ?? 0);
        } else {
          closestHigher = 100;
        }

        const valueRatio = (frame - closestLower) / closestHigher;
        const frameValue =
          lowerValue * (1 - valueRatio) + higherValue * valueRatio;
        compiledStep[frame] = frameValue;
      }
    }

    const mergedSteps: AnimationSteps = {};
    for (const frame of allFramesList) {
      const values: string[] = [];

      for (let s = 0; s < compiledSteps.length; s++) {
        values.push(
          `${animations.animations[s].property}(${compiledSteps[s][frame]}${
            animations.animations[s].unit ?? ""
          })`,
        );
      }
      mergedSteps[frame] = values.join(" ");
    }

    return {
      scope: animations.scope,
      type: animations.type,
      property: animations.type,
      steps: mergedSteps,
      duration: maxLateness,
      delay: animations.delay ?? FunTextCompiler.DEFAULT_ANIMATION.delay,
      iteration:
        `${animations.iteration}` ??
        FunTextCompiler.DEFAULT_ANIMATION.iteration,
      direction:
        animations.direction ?? FunTextCompiler.DEFAULT_ANIMATION.direction,
      timing: animations.timing ?? FunTextCompiler.DEFAULT_ANIMATION.timing,
      fill: animations.fill ?? FunTextCompiler.DEFAULT_ANIMATION.fill,

      offset: animations.offset ?? FunTextCompiler.DEFAULT_ANIMATION.offset,
    };
  }

  private static addScopeAnimation(
    scopedAnimations: ScopedAnimations,
    animation: Animation,
    scope: string,
  ) {
    if (!scopedAnimations[scope]) {
      scopedAnimations[scope] = [];
    }
    scopedAnimations[scope].push(animation);
  }

  // MAIN
  static compileAnimations(
    inputAnimations: InputAnimation[],
  ): ScopedAnimations {
    const defaultAnimations: DefaultAnimation[] = [];
    let transformAnimations: TransformAnimations | null = null;
    let filterAnimations: FilterAnimations | null = null;

    for (const animation of inputAnimations) {
      if (!animation.type || animation.type === "default") {
        defaultAnimations.push(animation);
      } else if (animation.type === "transform") {
        transformAnimations = animation;
      } else if (animation.type === "filter") {
        filterAnimations = animation;
      }
    }

    const scopedAnimations: ScopedAnimations = {};
    scopedAnimations.letter = [];
    scopedAnimations.word = [];
    for (const animation of defaultAnimations) {
      const compiledAnimation = FunTextCompiler.compileAnimation(animation);
      FunTextCompiler.addScopeAnimation(
        scopedAnimations,
        compiledAnimation,
        compiledAnimation.scope,
      );
    }

    if (transformAnimations) {
      const compiledAnimation =
        FunTextCompiler.mergeAnimations(transformAnimations);
      FunTextCompiler.addScopeAnimation(
        scopedAnimations,
        compiledAnimation,
        compiledAnimation.scope,
      );
    }

    if (filterAnimations) {
      const compiledAnimation =
        FunTextCompiler.mergeAnimations(filterAnimations);
      FunTextCompiler.addScopeAnimation(
        scopedAnimations,
        compiledAnimation,
        compiledAnimation.scope,
      );
    }

    return scopedAnimations;
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
        divider.innerText = FunTextBuilder.WORD_SPLIT;
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

      html.appendChild(wordElement);

      // Add divider than was lost during the split operation
      if (wordIndex < words.length - 1) {
        const divider = FunTextBuilder.buildDivider();
        // divider.innerText = FunTextBuilder.WORD_SPLIT;
        divider.innerHTML = "&nbsp;";
        html.appendChild(divider);
      }
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
    display: inline-block;
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
