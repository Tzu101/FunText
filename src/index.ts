import type {
  Options,
  InputOptions,
  InputScope,
  InputAnimationSteps,
  DefaultAnimation,
  TransformAnimation,
  TransformAnimations,
  FilterAnimation,
  FilterAnimations,
  InputAnimationSync,
  InputAnimation,
  FinalScope,
  AnimationSteps,
  AnimationOffset,
  Animation,
  ScopedAnimations,
  KeyframeAnimation,
  KeyframeAnimations,
  FunTextElement,
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

  private static readonly DEFAULT_SPLIT = " ";
  private static readonly SCOPE_SPLIT = {
    word: FunTextCompiler.DEFAULT_SPLIT,
    letter: "",
  };

  private static readonly DEFAULT_PRIORITY = 1;
  private static readonly SCOPE_PRIORITY = {
    word: FunTextCompiler.DEFAULT_PRIORITY,
    letter: 3,
  };

  // UTILITY
  private static compileScope(
    scope: "word" | "letter" | InputScope,
  ): FinalScope {
    if (typeof scope === "string") {
      return {
        split: FunTextCompiler.SCOPE_SPLIT[scope],
        priority: FunTextCompiler.SCOPE_PRIORITY[scope],
      };
    }
    return scope;
  }

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

  private static compileOffset(offset: number | AnimationOffset) {
    if (typeof offset === "number") {
      return (
        index: number,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        priority: number,
      ) => {
        return index * offset;
      };
    }
    return offset;
  }

  private static compileAnimation(animation: DefaultAnimation): Animation {
    const scope = FunTextCompiler.compileScope(animation.scope);
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
    const offset = FunTextCompiler.compileOffset(
      animation.offset ?? FunTextCompiler.DEFAULT_ANIMATION.offset,
    );

    return {
      scope,
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

      offset,
    };
  }

  private static mergeAnimations(
    animations: TransformAnimations | FilterAnimations,
  ): Animation {
    const uniqueAnimations = new Set<string>();

    let maxLateness = 0;
    const compiledSteps: AnimationSteps[] = [];
    const compiledAnimations: (TransformAnimation | FilterAnimation)[] = [];

    for (const animation of animations.animations) {
      if (uniqueAnimations.has(animation.property)) {
        continue;
      } else {
        uniqueAnimations.add(animation.property);
      }

      const lateness = animation.duration + (animation.delay ?? 0);

      if (maxLateness < lateness) {
        maxLateness = lateness;
      }

      compiledSteps.push(FunTextCompiler.compileSteps(animation.steps));
      compiledAnimations.push(animation);
    }

    const allFramesSet = new Set<number>();
    for (let s = 0; s < compiledSteps.length; s++) {
      const animation = compiledAnimations[s];

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
          `${compiledAnimations[s].property}(${compiledSteps[s][frame]}${
            compiledAnimations[s].unit ?? ""
          })`,
        );
      }
      mergedSteps[frame] = values.join(" ");
    }

    return FunTextCompiler.compileAnimation({
      scope: animations.scope,
      property: animations.type,
      steps: mergedSteps,
      duration: maxLateness,
      delay: animations.delay,
      iteration: animations.iteration,
      direction: animations.direction,
      timing: animations.timing,
      fill: animations.fill,

      offset: animations.offset,
    });
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
    const uniqueAnimations = new Set<string>();
    const scopedAnimations: ScopedAnimations = {};

    for (const animation of inputAnimations) {
      if (!animation.type || animation.type === "default") {
        if (uniqueAnimations.has(animation.property)) {
          continue;
        } else {
          uniqueAnimations.add(animation.property);
        }

        const compiledAnimation = FunTextCompiler.compileAnimation(animation);

        FunTextCompiler.addScopeAnimation(
          scopedAnimations,
          compiledAnimation,
          String(compiledAnimation.scope.priority),
        );
      } else if (
        animation.type === "transform" ||
        animation.type === "filter"
      ) {
        const compiledAnimation = FunTextCompiler.mergeAnimations(animation);
        FunTextCompiler.addScopeAnimation(
          scopedAnimations,
          compiledAnimation,
          String(compiledAnimation.scope.priority),
        );
      }
    }

    return scopedAnimations;
  }
}

class FunTextBuilder {
  /* 
		HTML
	*/

  // CONSTANTS
  private static readonly CONTAINER_ELEMENT = "div";
  private static readonly TEXT_ELEMENT = "p";
  private static readonly NEWLINE_ELEMENT = "br";

  // TODO: Root class, element class (funtext funtext__element funtext__element--word)
  private static readonly BASE_CLASS = "funtext";

  // UTILITY
  private static sortScopes(animations: ScopedAnimations): {
    [key: string]: (string | RegExp)[];
  } {
    // Sort the id of scopes by priority
    const sortedScopes = Object.keys(animations).sort(
      (scope1, scope2) => Number(scope1) - Number(scope2),
    );

    const groupedScopes: { [key: string]: (string | RegExp)[] } = {};
    for (const priority of sortedScopes) {
      groupedScopes[priority] = animations[priority].map(
        (animation) => animation.scope.split,
      );
    }

    return groupedScopes;
  }

  private static createElement(
    element: FunTextElement,
    regex: string | RegExp,
    animations: Animation[],
    priority: string,
    index: number,
  ): number {
    if (element.tag === FunTextBuilder.NEWLINE_ELEMENT) {
      return index + 1;
    }

    if (typeof element.children === "string") {
      const snipets = element.children.split(regex);
      if (snipets.length > 1) {
        element.children = [];
        element.tag = FunTextBuilder.CONTAINER_ELEMENT;

        for (const snipet of snipets) {
          if (!snipet) {
            continue;
          }

          // Set css classes
          const newElement: FunTextElement = {
            tag: FunTextBuilder.TEXT_ELEMENT,
            classes: [
              FunTextBuilder.BASE_CLASS,
              `${FunTextBuilder.BASE_CLASS}--scope${priority}`,
            ],
            children: snipet,
          };

          // Set css variable
          newElement.variables = [];
          for (const animation of animations) {
            const offsetName = `--offset-${animation.scope.priority}-${animation.property}`;
            const offsetValue = `${animation.offset(index, Number(priority))}s`;
            newElement.variables.push([offsetName, offsetValue]);
          }

          if (snipet === "\n") {
            newElement.tag = FunTextBuilder.NEWLINE_ELEMENT;
            newElement.children = "";
          }

          element.children.push(newElement);
          index += 1;
        }
      } else {
        element.classes.push(`${FunTextBuilder.BASE_CLASS}--scope${priority}`);

        element.variables = [];
        for (const animation of animations) {
          const offsetName = `--offset-${animation.scope.priority}-${animation.property}`;
          const offsetValue = `${animation.offset(index, Number(priority))}s`;
          element.variables.push([offsetName, offsetValue]);
        }

        index += 1;
      }
    } else {
      for (const child of element.children) {
        index = FunTextBuilder.createElement(
          child,
          regex,
          animations,
          priority,
          index,
        );
      }
    }

    return index;
  }

  private static buildElement(element: FunTextElement): HTMLElement {
    const htmlElement = document.createElement(element.tag);

    for (const cls of element.classes) {
      htmlElement.classList.add(cls);
    }

    if (element.variables) {
      for (const variable of element.variables) {
        htmlElement.style.setProperty(variable[0], variable[1]);
      }
    }

    if (typeof element.children === "string") {
      htmlElement.innerText = element.children;
    } else {
      for (const child of element.children) {
        htmlElement.appendChild(FunTextBuilder.buildElement(child));
      }
    }

    return htmlElement;
  }

  // MAIN
  static buildHtml(
    options: Options,
    animations: ScopedAnimations,
  ): HTMLElement {
    const root: FunTextElement = {
      tag: FunTextBuilder.TEXT_ELEMENT,
      classes: [FunTextBuilder.BASE_CLASS],
      children: options.text,
    };

    const scopes = FunTextBuilder.sortScopes(animations);

    for (const scopePriority of Object.keys(scopes)) {
      const regexes: RegExp[] = [];

      // Default newline break
      regexes.push(new RegExp(`(\n)`, "g"));

      let isEmptyScope = false;
      for (const scope of scopes[scopePriority]) {
        if (typeof scope === "string") {
          // Empty string
          if (scope === "") {
            isEmptyScope = true;
            break;
          } else {
            regexes.push(new RegExp(`(${scope})`, "g"));
          }
        } else {
          regexes.push(scope);
        }
      }

      let splitRegex: string | RegExp = "";
      if (!isEmptyScope) {
        splitRegex = new RegExp(
          regexes.map((regex) => regex.source).join("|"),
          "g",
        );
      }

      // Animations of the current scope
      const scopeAnimations = animations[scopePriority];

      FunTextBuilder.createElement(
        root,
        splitRegex,
        scopeAnimations,
        scopePriority,
        0,
      );
    }

    return FunTextBuilder.buildElement(root);

    // Element tree construction
    /*const words = options.text.split(" ");
    let letterCount = 0;
    for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
      // Empty word element means its a divider
      const letters = words[wordIndex].split("");
      if (letters.length === 0) {
        const divider = FunTextBuilder.buildDivider(
          FunTextBuilder.DIVIDER_ELEMENT,
        );
        divider.innerText = " ";
        html.appendChild(divider);
        continue;
      }

      // Word element init
      const wordElement = document.createElement(FunTextBuilder.WORD_ELEMENT);
      wordElement.classList.add(FunTextBuilder.BASE_CLASS);
      wordElement.classList.add(FunTextBuilder.WORD_CLASS);
      html.appendChild(wordElement);

      // Word animation offset
      for (const wordAnimation of animations.word) {
        const animationName = `--offset-${wordAnimation.scope.id}-${wordAnimation.property}`;
        const animationOffset = `${wordAnimation.offset(
          wordIndex,
          letterCount,
          words.length,
          letters.length,
        )}s`;
        wordElement.style.setProperty(animationName, animationOffset);
      }

      // Letter elements init
      for (
        let letterIndex = 0;
        letterIndex < letters.length;
        letterIndex++, letterCount++
      ) {
        // Newline detected
        const letterCharacter = letters[letterIndex];
        if (letterCharacter === FunTextBuilder.NEWLINE_STRING) {
          const divider = FunTextBuilder.buildDivider(
            FunTextBuilder.NEWLINE_ELEMENT,
          );
          html.appendChild(divider);
          continue;
        }

        const letterElement = document.createElement(
          FunTextBuilder.LETTER_ELEMENT,
        );
        letterElement.classList.add(FunTextBuilder.BASE_CLASS);
        letterElement.classList.add(FunTextBuilder.LETTER_CLASS);
        letterElement.innerText = letterCharacter;
        wordElement.appendChild(letterElement);

        // Letter animation offset
        for (const letterAnimation of animations.letter) {
          const animationName = `--offset-${letterAnimation.scope.id}-${letterAnimation.property}`;
          const animationOffset = `${letterAnimation.offset(
            wordIndex,
            letterCount,
            words.length,
            letters.length,
          )}s`;
          letterElement.style.setProperty(animationName, animationOffset);
        }
      }

      // Add divider than was lost during the split operation
      if (wordIndex < words.length - 1) {
        const divider = FunTextBuilder.buildDivider(
          FunTextBuilder.DIVIDER_ELEMENT,
        );
        // divider.innerText = FunTextBuilder.WORD_SPLIT;
        divider.innerHTML = "&nbsp;";
        html.appendChild(divider);
      }
    }

    return html;*/
  }

  /*
		STYLE
	*/

  // CONSTANTS
  private static readonly KEYFRAME = "funtext-keyframe";

  private static readonly DEFAULT_PROPERTY_VALUE: {
    [key: string]: string;
  } = {
    transform: "0",
    filter: "0",
  };

  private static readonly DEFAULT_CSS = `
    display: inline-block;
    margin: 0;
    padding: 0;
    white-space: pre-wrap;
  `;

  // UTILITY
  private static buildKeyframes(name: string, animation: Animation): string {
    let keyframes = "";

    for (const stepPercent of Object.keys(animation.steps)) {
      const stepValue = animation.steps[Number(stepPercent)];

      keyframes += `${stepPercent}% { ${animation.property}: ${
        stepValue ??
        FunTextBuilder.DEFAULT_PROPERTY_VALUE[animation.property] ??
        "inherit"
      } }`;
    }

    return `
      @keyframes ${name} {
        ${keyframes}
      }
    `;
  }

  private static buildAnimation(animation: Animation): KeyframeAnimation {
    const name = `${FunTextBuilder.KEYFRAME}-${animation.scope.priority}-${animation.property}`;
    const keyframes = FunTextBuilder.buildKeyframes(name, animation);

    const duration = `${animation.duration}s`;
    const delay = `calc(${animation.delay}s + var(--offset-${animation.scope.priority}-${animation.property}))`;

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

  private static buildClass(
    animations: KeyframeAnimation[],
    priority: string,
  ): string {
    return `
    .${FunTextBuilder.BASE_CLASS}--scope${priority} {
      animation-name: ${FunTextBuilder.joinValues("name", animations, ",")};
      animation-duration: ${FunTextBuilder.joinValues(
        "duration",
        animations,
        ",",
      )};
      animation-delay: ${FunTextBuilder.joinValues("delay", animations, ",")};
      animation-iteration-count: ${FunTextBuilder.joinValues(
        "iteration",
        animations,
        ",",
      )};
      animation-direction: ${FunTextBuilder.joinValues(
        "direction",
        animations,
        ",",
      )};
      animation-timing-function: ${FunTextBuilder.joinValues(
        "timing",
        animations,
        ",",
      )};
      animation-fill-mode: ${FunTextBuilder.joinValues(
        "fill",
        animations,
        ",",
      )};
    }
    `;
  }

  // MAIN
  static buildStyle(animations: ScopedAnimations): HTMLStyleElement {
    const buildAnimations: KeyframeAnimations = {};
    for (const priority of Object.keys(animations)) {
      buildAnimations[priority] = [];
      for (const animation of animations[priority]) {
        buildAnimations[priority].push(
          FunTextBuilder.buildAnimation(animation),
        );
      }
    }

    const keyframes: string[] = [];
    const classes: string[] = [];
    for (const priority of Object.keys(buildAnimations)) {
      keyframes.push(
        FunTextBuilder.joinValues("keyframes", buildAnimations[priority], "\n"),
      );
      classes.push(
        FunTextBuilder.buildClass(buildAnimations[priority], priority),
      );
    }

    const style = document.createElement("style");
    style.innerHTML = `
      ${keyframes.join("\n")}
      ${classes.join("\n")}

      .${FunTextBuilder.BASE_CLASS} {
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
