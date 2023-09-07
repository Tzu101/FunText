type AnimationScope = "word" | "letter";
export type AnimationType =
  | "horizontal"
  | "vertical"
  | "color"
  | "background"
  | "opacity"
  | "scale"
  | "rotation";

export interface Animation {
  scope: AnimationScope;
  type: AnimationType;

  steps: [string, string];
  offset?: number;

  duration?: number;
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

export interface CompiledAnimation {
  scope: AnimationScope;
  type: AnimationType;

  steps: [string, string];
  offset: number;

  duration: number;
  delay: number;
  iteration: string;
  direction: string;
  timing: string;
  fill: string;
}

export interface Options {
  text?: string;
}
