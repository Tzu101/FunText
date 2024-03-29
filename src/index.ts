import cloneDeep from "lodash/cloneDeep";
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
  AnimationCallback,
  InputAnimation,
  FinalScope,
  AnimationSteps,
  AnimationOffset,
  Animation,
  ScopedAnimations,
  KeyframeAnimation,
  KeyframeAnimations,
  CssClasses,
  FunTextElement,
  AnimationId,
  CompiledAnimationId,
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
    tags: {
      container: "div",
      text: "p",
      break: "br",
    },
    css: {
      default: `
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
    },
    openMode: false,
  };

  // MAIN
  static mergeOptions(input?: InputOptions): Options {
    // Creates deep copy
    const defaults = cloneDeep(FunTextCompiler.DEFAULT_OPTIONS);

    if (!input) {
      return defaults;
    }

    const copy = cloneDeep(input);

    return {
      ...defaults,
      ...copy,
      defaults: {
        ...defaults.defaults,
        ...copy.defaults,
      },
      tags: {
        ...defaults.tags,
        ...copy.tags,
      },
      css: {
        ...defaults.css,
        ...copy.css,
      },
      accessibility: {
        ...defaults.accessibility,
        ...copy.accessibility,
      },
    };
  }

  static compileOptions(
    inputOptions: InputOptions | undefined,
    containerText: string | undefined,
  ): Options {
    const options = FunTextCompiler.mergeOptions(inputOptions);

    options.text = options.text ?? containerText;

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
    all: /^(?=.)/,
  };

  private static readonly DEFAULT_PRIORITY = 1;
  static readonly SCOPE_PRIORITY = {
    word: FunTextCompiler.DEFAULT_PRIORITY,
    letter: 3,
    all: -10000,
  };

  // UTILITY
  private static compileScope(
    scope?: "word" | "letter" | InputScope,
  ): FinalScope {
    scope = scope ?? "letter";
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
      compiledSteps[0] = null;
      compiledSteps[100] = steps;
      return compiledSteps;
    }

    // Parameter steps is of type array
    if (Array.isArray(steps)) {
      if (steps.length === 0) {
        return compiledSteps;
      }

      compiledSteps[0] = null;

      const stepInterval = 100 / steps.length;
      for (let step = 0; step < steps.length; step++) {
        const stepPercentage = Math.min((step + 1) * stepInterval, 100);
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
    if (fill === "backwards" || fill === "both") {
      syncedSteps[minStep - 0.01] = syncedSteps[minStep];
    } else {
      syncedSteps[minStep - 0.01] = null;
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
      iteration: animation.iteration
        ? `${animation.iteration}`
        : `${options.defaults.iteration}`,
      direction: animation.direction ?? options.defaults.direction,
      timing: animation.timing ?? options.defaults.timing,
      fill: animation.fill ?? options.defaults.fill,
      state: animation.state ?? options.defaults.state,

      offset,

      onStart: animation.onStart,
      onEnd: animation.onEnd,
      onIterationStart: animation.onIterationStart,
      onIterationEnd: animation.onIterationEnd,
      onCancel: animation.onCancel,
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

    for (const animation of animations.properties) {
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
    const animationLimits: [number, number][] = [];
    for (let s = 0; s < compiledSteps.length; s++) {
      const steps = compiledSteps[s];
      const animation = compiledAnimations[s];
      const delay = animation.delay ?? 0;
      const delayPercent = delay / maxLateness;
      const durationRatio = (animation.duration + delay) / maxLateness;

      let defaultValue = 0;
      if (animation.property === "opacity") {
        defaultValue = 1;
      }

      const syncedSteps: AnimationSteps = {};
      let minStep = 100;
      let maxStep = 0;
      for (const stepPercent of Object.keys(steps)) {
        const stepPercentNum = Number(stepPercent);
        const syncedStepPercent = stepPercentNum * durationRatio + delayPercent;
        syncedSteps[syncedStepPercent] = steps[stepPercentNum] ?? defaultValue;

        minStep = Math.min(minStep, syncedStepPercent);
        maxStep = Math.max(maxStep, syncedStepPercent);
        allFramesSet.add(syncedStepPercent);
      }

      const animationLimit: [number, number] = [minStep, maxStep];

      // Indicate keyframes before and after sync need default value
      if (animations.fill === "backwards" || animations.fill === "both") {
        const newStep = minStep - 0.01;
        if (newStep > 0) {
          syncedSteps[newStep] = syncedSteps[minStep];
          allFramesSet.add(newStep);
          animationLimit[0] = newStep;
        }
      } else {
        const newStep = minStep - 0.01;
        if (newStep > 0) {
          syncedSteps[newStep] = defaultValue;
          allFramesSet.add(newStep);
          animationLimit[0] = newStep;
        }
      }

      if (animations.fill === "forwards" || animations.fill === "both") {
        const newStep = maxStep + 0.01;
        if (newStep < 100) {
          syncedSteps[newStep] = syncedSteps[maxStep];
          allFramesSet.add(newStep);
          animationLimit[1] = newStep;
        }
      } else {
        const newStep = maxStep + 0.01;
        if (newStep < 100) {
          syncedSteps[newStep] = defaultValue;
          allFramesSet.add(newStep);
          animationLimit[1] = newStep;
        }
      }

      // Indicate keyframes at the start and end need default value if they dont exist
      if (!syncedSteps[0]) {
        if (animations.fill === "backwards" || animations.fill === "both") {
          syncedSteps[0] = syncedSteps[minStep];
          allFramesSet.add(0);
        } else {
          syncedSteps[0] = defaultValue;
          allFramesSet.add(0);
        }
      }
      if (!syncedSteps[100]) {
        if (animations.fill === "forwards" || animations.fill === "both") {
          syncedSteps[100] = syncedSteps[maxStep];
          allFramesSet.add(100);
        } else {
          syncedSteps[100] = defaultValue;
          allFramesSet.add(100);
        }
      }

      animationLimits.push(animationLimit);
      compiledSteps[s] = syncedSteps;
    }

    const allFramesList = Array.from(allFramesSet);
    for (let s = 0; s < compiledSteps.length; s++) {
      const compiledStep = compiledSteps[s];
      const animationLimit = animationLimits[s];
      const stepFrames = Object.keys(compiledStep).map((f) => Number(f));

      for (const frame of Array.from(allFramesList)) {
        if (compiledStep[frame] !== null && compiledStep[frame] !== undefined) {
          continue;
        }

        if (frame < animationLimit[0]) {
          compiledStep[frame] = compiledStep[animationLimit[0]];
          continue;
        } else if (frame > animationLimit[1]) {
          compiledStep[frame] = compiledStep[animationLimit[1]];
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

        onStart: animations.onStart,
        onEnd: animations.onEnd,
        onIterationStart: animations.onIterationStart,
        onIterationEnd: animations.onIterationEnd,
        onCancel: animations.onCancel,
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

type RecursiveData = {
  first: FunTextElement | null;
  last: FunTextElement | null;
  depth: number;
  maxDepth: number;
};
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
    data: RecursiveData,
  ): number {
    if (data.depth > data.maxDepth) {
      data.maxDepth = data.depth;
      data.first = element;
      data.last = element;
    } else if (data.depth === data.maxDepth) {
      data.maxDepth = data.depth;
      data.last = element;
    }

    if (element.tag === options.tags.break) {
      return index + 1;
    }

    if (typeof element.children === "string") {
      const snipets = element.children.split(regex);
      element.children = [];
      element.tag = options.tags.container;
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
          tag: options.tags.text,
          classes: [FunTextBuilder.getScopeClass(priority)],
          children: snipet,
          variables: [],
        };

        if (snipet === "\n") {
          newElement.tag = options.tags.break;
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
      data.depth += 1;

      for (const child of element.children) {
        index = FunTextBuilder.createElement(
          child,
          regex,
          animations,
          priority,
          index,
          options,
          data,
        );
      }

      data.depth -= 1;
    }

    return index;
  }

  private static BuildAnimationCallback(
    callback: AnimationCallback,
  ): AnimationCallback {
    return (event: AnimationEvent) => {
      event.stopPropagation();
      callback(event);
    };
  }

  private static buildElement(element: FunTextElement): HTMLElement {
    const htmlElement = document.createElement(element.tag);

    for (const cls of element.classes) {
      htmlElement.classList.add(cls);
    }

    for (const variable of element.variables) {
      htmlElement.style.setProperty(variable[0], variable[1]);
    }

    if (typeof element.children === "string") {
      htmlElement.innerText = element.children;
    } else {
      for (const child of element.children) {
        htmlElement.appendChild(FunTextBuilder.buildElement(child));
      }
    }

    if (element.onStart) {
      for (const onFunction of element.onStart) {
        htmlElement.addEventListener(
          "animationstart",
          FunTextBuilder.BuildAnimationCallback(onFunction),
        );
      }
    }
    if (element.onEnd) {
      for (const onFunction of element.onEnd) {
        htmlElement.addEventListener(
          "animationend",
          FunTextBuilder.BuildAnimationCallback(onFunction),
        );
      }
    }
    if (element.onIteration) {
      for (const onFunction of element.onIteration) {
        htmlElement.addEventListener(
          "animationiteration",
          FunTextBuilder.BuildAnimationCallback(onFunction),
        );
      }
    }
    if (element.onCancel) {
      for (const onFunction of element.onCancel) {
        htmlElement.addEventListener(
          "animationcancel",
          FunTextBuilder.BuildAnimationCallback(onFunction),
        );
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
      tag: options.tags.text,
      classes: [FunTextBuilder.ROOT_CLASS, FunTextBuilder.TEXT_CLASS],
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

      const data: RecursiveData = {
        first: null,
        last: null,
        depth: 0,
        maxDepth: -1,
      };
      FunTextBuilder.createElement(
        root,
        splitRegex,
        scopeAnimations,
        scopePriority,
        0,
        options,
        data,
      );

      if (
        data.last &&
        typeof data.last.children !== "string" &&
        data.last.children.length > 0
      ) {
        const lastElement = data.last.children[data.last.children.length - 1];

        for (const animation of scopeAnimations) {
          if (animation.onEnd) {
            if (!lastElement.onEnd) {
              lastElement.onEnd = [];
            }
            lastElement.onEnd.push(animation.onEnd);
          }

          if (animation.onIterationEnd) {
            if (!lastElement.onIteration) {
              lastElement.onIteration = [];
            }
            lastElement.onIteration.push(animation.onIterationEnd);
          }
        }
      }

      if (
        data.first &&
        typeof data.first.children !== "string" &&
        data.first.children.length > 0
      ) {
        const firstElement = data.first.children[0];

        for (const animation of scopeAnimations) {
          if (animation.onStart) {
            if (!firstElement.onStart) {
              firstElement.onStart = [];
            }
            firstElement.onStart.push(animation.onStart);
          }

          if (animation.onIterationStart) {
            if (!firstElement.onIteration) {
              firstElement.onIteration = [];
            }
            firstElement.onIteration.push(animation.onIterationStart);
          }

          if (animation.onCancel) {
            if (!firstElement.onCancel) {
              firstElement.onCancel = [];
            }
            firstElement.onCancel.push(animation.onCancel);
          }
        }
      }
    }
    root.classes.push(FunTextBuilder.CONTAINER_CLASS);

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

  private static buildClasses(css: CssClasses): string {
    return `
      .${FunTextBuilder.ROOT_CLASS} {
        ${css.default ?? ""}
        ${css.root ?? ""}
      }

      .${FunTextBuilder.CONTAINER_CLASS} {
        ${css.default ?? ""}
        ${css.container ?? ""}
      }

      .${FunTextBuilder.TEXT_CLASS} {
        ${css.default ?? ""}
        ${css.text ?? ""}
      }

      .${FunTextBuilder.BREAK_CLASS} {
        ${css.default ?? ""}
        ${css.break ?? ""}
      }

      ${css.raw ?? ""}
    `;
  }

  private static buildCss(options: Options): string {
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
          transform: translate(0, 0) translate3d(0, 0, 0) translateX(0) translateY(0) translateZ(0) rotate(0) rotate3d(0, 0, 0, 0) rotateX(0) rotateY(0) rotateZ(0) !important;
        }
      }
      `;
    }

    const light = `
      ${FunTextBuilder.buildClasses(options.css)}
    `;

    let dark = "";
    if (options.css.dark) {
      dark = `
        @media (prefers-color-scheme: dark) {
          ${FunTextBuilder.buildClasses(options.css.dark)}
        }
      `;
    }

    let layout = "";
    const sizes = Object.keys(options.css)
      .filter((key) => {
        return !isNaN(parseFloat(key));
      })
      .sort((s1, s2) => Number(s2) - Number(s1));
    for (const size of sizes) {
      layout += `
        @media (max-width: ${size}px) {
          ${
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            FunTextBuilder.buildClasses(options.css[size])
          }
        }
      `;
    }

    const css = `
      ${light}
      ${dark}
      ${layout}
      ${accessibility}
    `;

    return css;
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
    const scopes: string[] = [];
    for (const priority of Object.keys(buildAnimations)) {
      keyframes.push(
        FunTextBuilder.joinValues("keyframes", buildAnimations[priority], "\n"),
      );
      scopes.push(
        FunTextBuilder.buildClass(buildAnimations[priority], priority),
      );
    }

    const css = FunTextBuilder.buildCss(options);
    const style = document.createElement("style");
    style.innerHTML = `
      ${keyframes.join("\n")}
      ${scopes.join("\n")}
      ${css}
    `;

    return style;
  }
}

export class FunText {
  // Default options
  static set options(options: InputOptions) {
    FunText.setOptions(options);
  }
  static setOptions(options: InputOptions) {
    FunTextCompiler.DEFAULT_OPTIONS = FunTextCompiler.mergeOptions(options);
  }

  // Instance
  private _container: HTMLElement;
  private _options: Options;
  private _animations: ScopedAnimations;
  private inputAnimations: InputAnimation[];
  private html: HTMLElement[];
  private style: HTMLStyleElement;
  private shadowRoot: ShadowRoot | null;
  _isMounted = false;

  constructor(
    container: HTMLElement,
    animations: InputAnimation[],
    options?: InputOptions,
  ) {
    this.inputAnimations = cloneDeep(animations);

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

    if (this._isMounted) {
      return this;
    }

    this._isMounted = true;

    this.shadowRoot.innerHTML = "";

    for (const htmlElement of this.html) {
      this.shadowRoot.appendChild(htmlElement);
    }
    this.shadowRoot.appendChild(this.style);

    return this;
  }

  unmount() {
    if (!this.shadowRoot) {
      console.warn("Shadow root not available");
      return;
    }

    if (!this._isMounted) {
      return this;
    }

    this._isMounted = false;

    this.shadowRoot.innerHTML = "";
    this.shadowRoot.appendChild(document.createElement("slot"));

    return this;
  }

  // Get parameters
  get container() {
    return this._container;
  }

  get animations() {
    return this.inputAnimations;
  }

  get options() {
    return this._options;
  }

  // Change parameters
  rebuild() {
    this.html = FunTextBuilder.buildHtml(this._options, this._animations);
    this.style = FunTextBuilder.buildStyle(this._options, this._animations);

    if (this._isMounted) {
      this.unmount();
      this.mount();
    }

    return this;
  }

  setContainer(container: HTMLElement) {
    const newShadow = this.getShadowRoot(container, this._options);

    if (newShadow) {
      if (this._options.text === this._container.textContent) {
        this._options.text = container.textContent ?? undefined;
      } else {
        this._options.text =
          this._options.text ?? container.textContent ?? undefined;
      }

      this._container = container;
      this.html = FunTextBuilder.buildHtml(this._options, this._animations);

      const wasMounted = this._isMounted;
      if (this._isMounted) {
        this.unmount();
      }

      this.shadowRoot = newShadow;
      if (wasMounted) {
        this.mount();
      }
    } else {
      console.warn("Could not access container shadow root");
    }

    return this;
  }

  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures
  set container(container: HTMLElement) {
    this.setContainer(container);
  }

  setOptions(options: InputOptions) {
    this._options = FunTextCompiler.compileOptions(
      options,
      this._container.textContent ?? undefined,
    );
    this._animations = FunTextCompiler.compileAnimations(
      this.inputAnimations,
      this._options,
    );
    this.rebuild();

    return this;
  }

  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures
  set options(options: InputOptions) {
    this.setOptions(options);
  }

  setAnimations(animations: InputAnimation[]) {
    this._animations = FunTextCompiler.compileAnimations(
      animations,
      this._options,
    );
    this.rebuild();

    return this;
  }

  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures
  set animations(animations: InputAnimation[]) {
    this.setAnimations(animations);
  }

  // Get info
  get isMounted() {
    return this._isMounted;
  }

  private compileAnimtionsId(id: AnimationId): CompiledAnimationId {
    let scope = id.scope;
    if (scope === "word" || scope === "letter") {
      scope = FunTextCompiler.SCOPE_PRIORITY[scope];
    }

    return {
      scope,
      property: id.property,
    };
  }

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

  private getPlayStateVariable(id: CompiledAnimationId): string {
    return FunTextBuilder.getPlayStateVariable(id.scope, id.property);
  }

  private getPlayingState(id: string): string {
    return this.html[0].style.getPropertyValue(id);
  }

  isPlaying(id: AnimationId): boolean {
    const cid = this.compileAnimtionsId(id);
    const playStateVariable = this.getPlayStateVariable(cid);
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
  isPlayingAll(): boolean {
    return !this.isPausedAny();
  }

  isPaused(id: AnimationId): boolean {
    const cid = this.compileAnimtionsId(id);
    const playStateVariable = this.getPlayStateVariable(cid);
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
  isPausedAll(): boolean {
    return !this.isPlayingAny();
  }

  // Toggle animation/s
  private setPlayState(id: string | CompiledAnimationId, state: boolean) {
    const playStateVariable =
      typeof id === "string" ? id : this.getPlayStateVariable(id);
    const playState = state ? "running" : "paused";
    this.html[0].style.setProperty(playStateVariable, playState);
  }

  toggle(id: AnimationId) {
    const cid = this.compileAnimtionsId(id);
    this.setPlayState(cid, !this.isPlaying(id));

    return this;
  }
  toggleAll() {
    const variables = this.getInlineVariables(this.html[0]);
    for (const variable of variables) {
      this.setPlayState(
        variable,
        !(this.getPlayingState(variable) === "running"),
      );
    }

    return this;
  }

  play(id: AnimationId, state = true) {
    const cid = this.compileAnimtionsId(id);
    this.setPlayState(cid, state);

    return this;
  }
  playAll(state = true) {
    const variables = this.getInlineVariables(this.html[0]);
    for (const variable of variables) {
      this.setPlayState(variable, state);
    }

    return this;
  }

  pause(id: AnimationId) {
    const cid = this.compileAnimtionsId(id);
    this.setPlayState(cid, false);

    return this;
  }
  pauseAll() {
    const variables = this.getInlineVariables(this.html[0]);
    for (const variable of variables) {
      this.setPlayState(variable, false);
    }

    return this;
  }

  // Reset animation/s
  reset(id: AnimationId) {
    const cid = this.compileAnimtionsId(id);
    const targetRule = FunTextBuilder.getKeyframesName(cid.scope, cid.property);

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

    return this;
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

    return this;
  }
}

// Additional library exports
export type { InputOptions, InputAnimation, AnimationId };

// Export for browser
if (window) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).FunText = FunText;
}
