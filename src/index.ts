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
  AnimationId,
} from "./types";

class FunTextCompiler {
  /* 
    OPTIONS
  */

  // CONSTANTS
  static DEFAULT_OPTIONS: Options = {
    text: undefined,
    defaults: {
      delay: 0,
      iteration: "1",
      direction: "normal",
      timing: "linear",
      fill: "none",
      state: "running",

      offset: 0.1,
      sync: {
        location: 0,
        duration: 0,
      },
    },
    nodes: {
      container: "div",
      text: "p",
      break: "br",
    },
    css: {
      global: `
        display: inline-block;
        margin: 0;
        padding: 0;
        white-space: pre-wrap;
      `,
      root: "",
      container: "",
      text: "",
      break: "",
      raw: "",
    },
    altcss: {
      global: `
        display: inline-block;
        margin: 0;
        padding: 0;
        white-space: pre-wrap;
      `,
      root: "",
      container: "",
      text: "",
      break: "",
      raw: "",
    },
    attributes: {},
    accessibility: {
      aria: true,
      prefersContrast: 0.15,
      prefersReducedMotion: false,
      prefersColorScheme: false,
    },
    openMode: false,
  };

  // MAIN
  static compileOptions(
    inputOptions: InputOptions | undefined,
    containerText: string,
  ): Options {
    // Creates deep copy
    const options = JSON.parse(JSON.stringify(FunTextCompiler.DEFAULT_OPTIONS));

    options.text =
      inputOptions?.text ??
      FunTextCompiler.DEFAULT_OPTIONS.text ??
      containerText;

    if (!inputOptions) {
      return options;
    }

    if (inputOptions.defaults) {
      options.defaults = {
        ...FunTextCompiler.DEFAULT_OPTIONS.defaults,
        ...inputOptions.defaults,
      };
    }
    if (inputOptions.nodes) {
      options.nodes = {
        ...FunTextCompiler.DEFAULT_OPTIONS.nodes,
        ...inputOptions.nodes,
      };
    }
    if (inputOptions.css) {
      options.css = {
        ...FunTextCompiler.DEFAULT_OPTIONS.css,
        ...inputOptions.css,
      };
    }
    if (inputOptions.altcss) {
      options.altcss = {
        ...FunTextCompiler.DEFAULT_OPTIONS.altcss,
        ...inputOptions.altcss,
      };
    }
    if (inputOptions.attributes) {
      options.attributes = {
        ...FunTextCompiler.DEFAULT_OPTIONS.attributes,
        ...inputOptions.attributes,
      };
    }
    if (inputOptions.accessibility) {
      options.accessibility = {
        ...FunTextCompiler.DEFAULT_OPTIONS.accessibility,
        ...inputOptions.accessibility,
      };
    }
    if (inputOptions.openMode) {
      options.openMode = inputOptions.openMode;
    }

    return options;
  }

  /* 
    ANIMATIONS
  */

  //CONSTANTS
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

  private static compileAnimation(
    animation: DefaultAnimation,
    options: Options,
  ): Animation {
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
      animation.offset ?? options.defaults.offset,
    );

    return {
      scope,
      property: animation.property,
      steps,
      duration,

      delay: animation.delay ?? options.defaults.delay,
      iteration: `${animation.iteration}` ?? options.defaults.iteration,
      direction: animation.direction ?? options.defaults.direction,
      timing: animation.timing ?? options.defaults.timing,
      fill: animation.fill ?? options.defaults.fill,
      state: animation.state ?? options.defaults.state,

      offset,
    };
  }

  private static mergeAnimations(
    animations: TransformAnimations | FilterAnimations,
    options: Options,
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

    return FunTextCompiler.compileAnimation(
      {
        scope: animations.scope,
        property: animations.type,
        steps: mergedSteps,
        duration: maxLateness,
        delay: animations.delay,
        iteration: animations.iteration,
        direction: animations.direction,
        timing: animations.timing,
        fill: animations.fill,
        state: animations.state,

        offset: animations.offset,
      },
      options,
    );
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
    options: Options,
  ): ScopedAnimations {
    const scopedAnimations: ScopedAnimations = {};

    for (const animation of inputAnimations) {
      if (!animation.type || animation.type === "default") {
        const compiledAnimation = FunTextCompiler.compileAnimation(
          animation,
          options,
        );

        FunTextCompiler.addScopeAnimation(
          scopedAnimations,
          compiledAnimation,
          String(compiledAnimation.scope.priority),
        );
      } else if (
        animation.type === "transform" ||
        animation.type === "filter"
      ) {
        const compiledAnimation = FunTextCompiler.mergeAnimations(
          animation,
          options,
        );
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
  private static readonly ROOT_CLASS = "funtext";
  private static readonly CONTAINER_CLASS = `${this.ROOT_CLASS}__container`;
  private static readonly TEXT_CLASS = `${this.ROOT_CLASS}__text`;
  private static readonly BREAK_CLASS = `${this.ROOT_CLASS}__break`;

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
    options: Options,
  ): number {
    if (element.tag === options.nodes.break) {
      return index + 1;
    }

    if (typeof element.children === "string") {
      const snipets = element.children.split(regex);
      element.children = [];
      element.tag = options.nodes.container;
      element.classes = element.classes.filter(
        (cls) => cls !== FunTextBuilder.TEXT_CLASS,
      );
      element.classes.push(FunTextBuilder.CONTAINER_CLASS);

      for (const snipet of snipets) {
        if (!snipet) {
          continue;
        }

        // Set css classes
        const newElement: FunTextElement = {
          tag: options.nodes.text,
          classes: [FunTextBuilder.getScopeClass(priority)],
          children: snipet,
          variables: [],
        };

        if (snipet === "\n") {
          newElement.tag = options.nodes.break;
          newElement.children = "";
          newElement.classes.push(FunTextBuilder.BREAK_CLASS);
        } else {
          newElement.classes.push(FunTextBuilder.TEXT_CLASS);
        }

        // Set css variable
        for (const animation of animations) {
          const offsetName = FunTextBuilder.getOffsetVariable(
            animation.scope.priority,
            animation.property,
          );
          const offsetValue = `${animation.offset(index, Number(priority))}s`;
          newElement.variables.push([offsetName, offsetValue]);
        }

        element.children.push(newElement);
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
          options,
        );
      }
    }

    return index;
  }

  private static buildElement(element: FunTextElement): HTMLElement {
    const htmlElement = document.createElement(element.tag);

    console.log(element.tag, element.children.length);

    for (const cls of element.classes) {
      htmlElement.classList.add(cls);
    }

    for (const variable of element.variables) {
      console.log(variable[0], variable[1]);
      htmlElement.style.setProperty(variable[0], variable[1]);
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
  static getScopeClass(priority: number | string): string {
    return `${FunTextBuilder.ROOT_CLASS}--scope${priority}`;
  }

  static getOffsetVariable(
    priority: number | string,
    property: string,
  ): string {
    return `--offset-${priority}-${property}`;
  }

  static getPlayStateVariable(
    priority: number | string,
    property: string,
  ): string {
    return `--play-state-${priority}-${property}`;
  }

  static buildHtml(
    options: Options,
    animations: ScopedAnimations,
  ): HTMLElement[] {
    const root: FunTextElement = {
      tag: options.nodes.text,
      classes: [FunTextBuilder.ROOT_CLASS, FunTextBuilder.CONTAINER_CLASS],
      children: options.text ?? "",
      variables: [],
    };

    for (const priority of Object.keys(animations)) {
      for (const animation of animations[priority]) {
        const playStateVariable = FunTextBuilder.getPlayStateVariable(
          priority,
          animation.property,
        );
        root.variables.push([playStateVariable, animation.state]);
      }
    }

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
        options,
      );
    }

    const html: HTMLElement[] = [];
    const rootElement = FunTextBuilder.buildElement(root);
    html.push(rootElement);

    // Accessibility aria
    if (options.accessibility.aria) {
      const aria = document.createElement("p");
      aria.setAttribute("aria-label", options.text ?? "");
      html.push(aria);

      rootElement.setAttribute("aria-hidden", "true");
    }

    // Add user specefied attribues
    for (const attribute of Object.keys(options.attributes)) {
      rootElement.setAttribute(attribute, options.attributes[attribute]);
    }

    return html;
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
    const name = FunTextBuilder.getKeyframesName(
      animation.scope.priority,
      animation.property,
    );
    const keyframes = FunTextBuilder.buildKeyframes(name, animation);

    const duration = `${animation.duration}s`;
    const delay = `calc(${
      animation.delay
    }s + var(${FunTextBuilder.getOffsetVariable(
      animation.scope.priority,
      animation.property,
    )}))`;

    const state = `var(${FunTextBuilder.getPlayStateVariable(
      animation.scope.priority,
      animation.property,
    )})`;

    return {
      name,
      keyframes,
      duration,
      delay,
      iteration: animation.iteration,
      direction: animation.direction,
      timing: animation.timing,
      fill: animation.fill,
      state,
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
    .${FunTextBuilder.getScopeClass(priority)} {
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
      animation-play-state: ${FunTextBuilder.joinValues(
        "state",
        animations,
        ",",
      )};
    }
    `;
  }

  // MAIN
  static getKeyframesName(priority: number | string, property: string): string {
    return `${FunTextBuilder.KEYFRAME}-${priority}-${property}`;
  }

  static buildStyle(
    options: Options,
    animations: ScopedAnimations,
  ): HTMLStyleElement {
    const buildAnimations: KeyframeAnimations = {};
    for (const priority of Object.keys(animations)) {
      buildAnimations[priority] = [];
      for (const animation of animations[priority]) {
        const buildAnimation = FunTextBuilder.buildAnimation(animation);
        buildAnimations[priority].push(buildAnimation);
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

    let accessibility = "";
    if (options.accessibility.aria) {
      accessibility += `
      [aria-label] {
        position: absolute !important; /* Outside the DOM flow */
        height: 1px; width: 1px; /* Nearly collapsed */
        overflow: hidden;
        clip: rect(1px 1px 1px 1px); /* IE 7+ only support clip without commas */
        clip: rect(1px, 1px, 1px, 1px); /* All other browsers */
      }`;
    }
    if (options.accessibility.prefersContrast) {
      accessibility += `
      @media (prefers-contrast: more) {
        .${FunTextBuilder.ROOT_CLASS} {
          filter: contrast(${1 + options.accessibility.prefersContrast});
        }
      }

      @media (prefers-contrast: less) {
        .${FunTextBuilder.ROOT_CLASS} {
          filter: contrast(${1 - options.accessibility.prefersContrast});
        }
      }
      `;
    }

    if (options.accessibility.prefersReducedMotion) {
      accessibility += `
      @media (prefers-reduced-motion) {
        .${FunTextBuilder.ROOT_CLASS} {
          transform: translate(0, 0) translate3d(0, 0, 0); translateX(0) translateY(0) translateZ(0) rotate(0) rotate3d(0, 0, 0, 0) rotateX(0) rotateY(0) rotateZ(0) !important;
        }
      }
      `;
    }

    let darkModeCss = "";
    if (options.accessibility.prefersColorScheme) {
      darkModeCss = `
      @media (prefers-color-scheme: dark) {
        .${FunTextBuilder.ROOT_CLASS} {
          ${options.altcss.global}
          ${options.altcss.root}
        }
  
        .${FunTextBuilder.CONTAINER_CLASS} {
          ${options.altcss.global}
          ${options.altcss.container}
        }
  
        .${FunTextBuilder.TEXT_CLASS} {
          ${options.altcss.global}
          ${options.altcss.text}
        }
  
        .${FunTextBuilder.BREAK_CLASS} {
          ${options.altcss.global}
          ${options.altcss.break}
        }
  
        ${options.altcss.raw}
      }
      `;
    }

    const style = document.createElement("style");
    style.innerHTML = `
      ${keyframes.join("\n")}
      ${classes.join("\n")}

      .${FunTextBuilder.ROOT_CLASS} {
        ${options.css.global}
        ${options.css.root}
      }

      .${FunTextBuilder.CONTAINER_CLASS} {
        ${options.css.global}
        ${options.css.container}
      }

      .${FunTextBuilder.TEXT_CLASS} {
        ${options.css.global}
        ${options.css.text}
      }

      .${FunTextBuilder.BREAK_CLASS} {
        ${options.css.global}
        ${options.css.break}
      }

      ${options.css.raw}

      ${darkModeCss}

      ${accessibility}
      `;

    return style;
  }
}

export class FunText {
  // Default options
  static set options(options: InputOptions) {
    FunTextCompiler.DEFAULT_OPTIONS.text =
      options.text ?? FunTextCompiler.DEFAULT_OPTIONS.text;

    FunTextCompiler.DEFAULT_OPTIONS.defaults = {
      ...FunTextCompiler.DEFAULT_OPTIONS.defaults,
      ...options.defaults,
    };

    FunTextCompiler.DEFAULT_OPTIONS.defaults.sync = {
      ...FunTextCompiler.DEFAULT_OPTIONS.defaults.sync,
      ...options.defaults?.sync,
    };

    FunTextCompiler.DEFAULT_OPTIONS.nodes = {
      ...FunTextCompiler.DEFAULT_OPTIONS.nodes,
      ...options.nodes,
    };

    FunTextCompiler.DEFAULT_OPTIONS.css = {
      ...FunTextCompiler.DEFAULT_OPTIONS.css,
      ...options.css,
    };

    FunTextCompiler.DEFAULT_OPTIONS.altcss = {
      ...FunTextCompiler.DEFAULT_OPTIONS.altcss,
      ...options.altcss,
    };

    FunTextCompiler.DEFAULT_OPTIONS.attributes = {
      ...FunTextCompiler.DEFAULT_OPTIONS.attributes,
      ...options.attributes,
    };

    FunTextCompiler.DEFAULT_OPTIONS.accessibility = {
      ...FunTextCompiler.DEFAULT_OPTIONS.accessibility,
      ...options.accessibility,
    };

    FunTextCompiler.DEFAULT_OPTIONS.openMode =
      options.openMode ?? FunTextCompiler.DEFAULT_OPTIONS.openMode;
  }

  private _container: HTMLElement;
  private _options: Options;
  private _animations: ScopedAnimations;
  private inputAnimations: InputAnimation[];
  private html: HTMLElement[];
  private style: HTMLStyleElement;
  private shadowRoot: ShadowRoot | null;
  isMounted = false;

  constructor(
    container: HTMLElement,
    animations: InputAnimation[],
    options?: InputOptions,
  ) {
    this.inputAnimations = JSON.parse(JSON.stringify(animations));

    this._container = container;
    this._options = FunTextCompiler.compileOptions(
      options,
      container.innerText,
    );
    this._animations = FunTextCompiler.compileAnimations(
      animations,
      this._options,
    );

    this.html = FunTextBuilder.buildHtml(this._options, this._animations);
    this.style = FunTextBuilder.buildStyle(this._options, this._animations);

    this.shadowRoot = this.getShadowRoot(container, this._options);
    if (!this.shadowRoot) {
      console.warn("Could not access container shadow root");
    } else {
      this.shadowRoot.appendChild(document.createElement("slot"));
    }
  }

  // Build text
  mount() {
    if (!this.shadowRoot) {
      console.warn("Shadow root not available");
      return;
    }

    this.isMounted = true;

    this.shadowRoot.innerHTML = "";

    for (const htmlElement of this.html) {
      this.shadowRoot.appendChild(htmlElement);
    }
    this.shadowRoot.appendChild(this.style);
  }

  unmount() {
    if (!this.shadowRoot) {
      console.warn("Shadow root not available");
      return;
    }

    this.isMounted = false;

    this.shadowRoot.innerHTML = "";
    this.shadowRoot.appendChild(document.createElement("slot"));
  }

  // Change parameters
  private rebuild() {
    this.html = FunTextBuilder.buildHtml(this._options, this._animations);
    this.style = FunTextBuilder.buildStyle(this._options, this._animations);

    if (this.isMounted) {
      this.unmount();
      this.mount();
    }
  }

  set container(container: HTMLElement) {
    const newShadow = this.getShadowRoot(container, this._options);

    if (newShadow) {
      this._container = container;

      const wasMounted = this.isMounted;
      if (this.isMounted) {
        this.unmount();
      }

      this.shadowRoot = newShadow;
      if (wasMounted) {
        this.mount();
      }
    } else {
      console.warn("Could not access container shadow root");
    }
  }

  set options(options: InputOptions) {
    this._options = FunTextCompiler.compileOptions(
      options,
      this._container.innerText,
    );
    this._animations = FunTextCompiler.compileAnimations(
      this.inputAnimations,
      this._options,
    );
    this.rebuild();
  }

  set animations(animations: InputAnimation[]) {
    this._animations = FunTextCompiler.compileAnimations(
      animations,
      this._options,
    );
    this.rebuild();
  }

  // Change container
  relocate(container: HTMLElement) {
    const newShadow = this.getShadowRoot(container, this._options);

    if (newShadow) {
      this.unmount();
      this.shadowRoot = newShadow;
      this.mount();
    } else {
      console.warn("Could not access container shadow root");
    }
  }

  // Get info
  private getShadowRoot(
    container: HTMLElement,
    options: Options,
  ): ShadowRoot | null {
    try {
      const shadowMode = options.openMode ? "open" : "closed";
      const shadowRoot = container.attachShadow({ mode: shadowMode });

      return shadowRoot;
    } catch (err) {
      console.error(err);
    }
    return null;
  }

  private getInlineVariables(element: HTMLElement): string[] {
    const inlineStyle = element.getAttribute("style") ?? "";
    const styleDeclarations = inlineStyle.split(";");
    return styleDeclarations
      .map((dec) => dec.split(":")[0].trim())
      .filter(
        (dec) => dec.startsWith("--") && element.style.getPropertyValue(dec),
      );
  }

  private getPlayStateVariable(id: AnimationId): string {
    return FunTextBuilder.getPlayStateVariable(id.scope, id.property);
  }

  private getPlayingState(id: string): string {
    return this.html[0].style.getPropertyValue(id);
  }

  isPlaying(id: AnimationId): boolean {
    const playStateVariable = this.getPlayStateVariable(id);
    return this.getPlayingState(playStateVariable) === "running";
  }
  isPlayingAny(): boolean {
    const variables = this.getInlineVariables(this.html[0]);
    for (const variable of variables) {
      if (this.getPlayingState(variable) === "running") {
        return true;
      }
    }
    return false;
  }

  isPaused(id: AnimationId): boolean {
    const playStateVariable = this.getPlayStateVariable(id);
    return this.getPlayingState(playStateVariable) === "paused";
  }
  isPausedAny(): boolean {
    const variables = this.getInlineVariables(this.html[0]);
    for (const variable of variables) {
      if (this.getPlayingState(variable) === "paused") {
        return true;
      }
    }
    return false;
  }

  // Toggle animation/s
  private setPlayState(id: string | AnimationId, state: boolean) {
    const playStateVariable =
      typeof id === "string" ? id : this.getPlayStateVariable(id);
    const playState = state ? "running" : "paused";
    this.html[0].style.setProperty(playStateVariable, playState);
  }

  toggle(id: AnimationId) {
    this.setPlayState(id, !this.isPlaying(id));
  }
  toggleAll() {
    const variables = this.getInlineVariables(this.html[0]);
    for (const variable of variables) {
      this.setPlayState(
        variable,
        !(this.getPlayingState(variable) === "running"),
      );
    }
  }

  play(id: AnimationId, state = true) {
    this.setPlayState(id, state);
  }
  playAll(state = true) {
    const variables = this.getInlineVariables(this.html[0]);
    for (const variable of variables) {
      this.setPlayState(variable, state);
    }
  }

  pause(id: AnimationId) {
    this.setPlayState(id, false);
  }
  pauseAll() {
    const variables = this.getInlineVariables(this.html[0]);
    for (const variable of variables) {
      this.setPlayState(variable, false);
    }
  }

  // Reset animation/s
  reset(id: AnimationId) {
    const targetRule = FunTextBuilder.getKeyframesName(id.scope, id.property);

    const sheet = this.style.sheet;

    if (!sheet) return;

    // Isolates keyframes rules
    const rules = Array.from(sheet.cssRules);
    for (let r = 0; r < rules.length; r++) {
      const rule = rules[r];

      if (rule instanceof CSSKeyframesRule) {
        if (rule.name === targetRule) {
          sheet.deleteRule(r);

          // Forces the stylesheet to reset
          void this.style.offsetHeight;

          sheet.insertRule(rule.cssText);

          break;
        }
      }
    }
  }

  resetAll() {
    const sheet = this.style.sheet;

    if (!sheet) return;

    // Isolates keyframes rules
    const rules = Array.from(sheet.cssRules);
    const deletedIndexes: number[] = [];
    const deletedRules: CSSKeyframesRule[] = [];
    for (let r = 0; r < rules.length; r++) {
      const rule = rules[r];

      if (rule instanceof CSSKeyframesRule) {
        deletedIndexes.push(r);
        deletedRules.push(rule);
      }
    }

    // Deletes in reverse order!
    for (const deletedIndex of deletedIndexes.reverse()) {
      sheet.deleteRule(deletedIndex);
    }

    // Forces the stylesheet to reset
    void this.style.offsetHeight;

    // Readds the rules
    for (const deletedRule of deletedRules) {
      sheet.insertRule(deletedRule.cssText);
    }
  }
}

// Additional library exports
export type { InputOptions, InputAnimation, AnimationId };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).FunText = FunText;
