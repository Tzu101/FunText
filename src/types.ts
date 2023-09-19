/*
  OPTIONS
*/

// Input options
export interface InputOptions {
  text?: string;
}

// Options
export interface Options {
  text: string;
}

/*
  ANIMATION
*/

// Input animation
type InputAnimationScope = "word" | "letter";

export interface InputAnimationSync {
  duration: number;
  location: number | "start" | "middle" | "end";
}

interface InputAnimationBase {
  scope: InputAnimationScope;

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

  // TODO: Offset calculate function
  offset?: number;
  sync?: InputAnimationSync;
}

export type StringAnimationSteps =
  | string
  | string[]
  | { [key: number]: string };

export type NumberAnimationSteps =
  | number
  | number[]
  | { [key: number]: number };

export type DefaultAnimation = {
  type?: "default";
  property: string;
  steps: StringAnimationSteps;
} & InputAnimationBase;

export type TransformAnimation = {
  type: "transform";
  property:
    | "rotate"
    | "translateX"
    | "translateY"
    | "scaleX"
    | "scaleY"
    | "scewX"
    | "scewY";
  steps: NumberAnimationSteps;
  unit: string;
} & InputAnimationBase;

export type FilterAnimation = {
  type: "filter";
  property:
    | "blue"
    | "brightness"
    | "contrast"
    | "grayscale"
    | "hue-rotate"
    | "invert"
    | "opacity"
    | "saturate"
    | "sepia";
  steps: NumberAnimationSteps;
  unit: string;
} & InputAnimationBase;

export type InputAnimation =
  | DefaultAnimation
  | TransformAnimation
  | FilterAnimation;

// Animation
export type AnimationType = "default" | "transform" | "filter";

export interface AnimationSteps {
  [key: number]: string | null;
}

export interface Animation {
  scope: string;
  type: AnimationType;
  property: string;
  steps: AnimationSteps;

  duration: number;
  delay: number;
  iteration: string;
  direction: string;
  timing: string;
  fill: string;

  offset: number;
}

export interface ScopedAnimations {
  word: Animation[];
  letter: Animation[];
}

// Keyframe animations
export interface KeyframeAnimation {
  name: string;
  keyframes: string;

  duration: string;
  delay: string;
  iteration: string;
  direction: string;
  timing: string;
  fill: string;
}
