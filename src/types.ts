export interface Options {
  text?: string;
}

type AnimationScope = "word" | "letter";

export type AnimationType =
  | "horizontal"
  | "vertical"
  | "color"
  | "background"
  | "opacity"
  | "scale"
  | "rotate";

export type AnimationSteps = string | string[] | CompiledAnimationSteps;

export interface AnimationSync {
  duration: number;
  location: number | "start" | "middle" | "end";
}

export interface Animation {
  scope: AnimationScope;
  type: AnimationType;

  steps: AnimationSteps;
  sync?: AnimationSync;
  offset?: number;

  duration: number;
  delay?: number;
  iteration?: number | string | "infinite";
  direction?: "normal" | "reverse" | "alternate" | "alternate-reverse";
  timing?:
    | "ease"
    | "ease-in"
    | "ease-out"
    | "ease-in-out"
    | "linear"
    | "step-start"
    | "step-end";
  // TODO `custom:${string}`
  fill?: "none" | "forwards" | "backwards" | "both" | "initial" | "inherit";
}

export interface CompiledAnimationSteps {
  [key: number]: string;
}

export interface CompiledAnimation {
  type: AnimationType;

  steps: CompiledAnimationSteps;
  offset: number;

  duration: number;
  delay: number;
  iteration: string;
  direction: string;
  timing: string;
  fill: string;
}

export interface CompiledAnimations {
  word: CompiledAnimation[];
  letter: CompiledAnimation[];
}
