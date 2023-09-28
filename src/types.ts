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

type strnum = string | number;
export type InputAnimationSteps = strnum | strnum[] | AnimationSteps;

interface AnimationProperties {
  scope: InputAnimationScope;

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
  offset?: number | AnimationOffset;
  sync?: InputAnimationSync;
}

export type DefaultAnimation = {
  type?: "default";
  property: string;
  steps: InputAnimationSteps;
  duration: number;
} & AnimationProperties;

export interface TransformAnimation {
  property:
    | "rotate"
    | "translateX"
    | "translateY"
    | "scaleX"
    | "scaleY"
    | "scewX"
    | "scewY";
  steps: InputAnimationSteps;
  unit: string;

  duration: number;
  delay?: number;
}
export type TransformAnimations = {
  type: "transform";
  animations: TransformAnimation[];
} & AnimationProperties;

export interface FilterAnimation {
  property:
    | "blur"
    | "brightness"
    | "contrast"
    | "grayscale"
    | "hue-rotate"
    | "invert"
    | "opacity"
    | "saturate"
    | "sepia";
  steps: InputAnimationSteps;
  unit: string;

  duration: number;
  delay?: number;
}
export type FilterAnimations = {
  type: "filter";
  animations: FilterAnimation[];
} & AnimationProperties;

export type InputAnimation =
  | DefaultAnimation
  | TransformAnimations
  | FilterAnimations;

// Animation
export interface AnimationSteps {
  [key: number]: strnum | null;
}

export type AnimationOffset = (
  wordInd: number,
  letterInd: number,
  wordNum: number,
  letterNum: number,
) => number;

export interface Animation {
  scope: string;
  property: string;
  steps: AnimationSteps;

  duration: number;
  delay: number;
  iteration: string;
  direction: string;
  timing: string;
  fill: string;

  offset: AnimationOffset;
}

export type ScopedAnimations = { [key: string]: Animation[] };

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
