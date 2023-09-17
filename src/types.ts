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
export type InputAnimationScope = "word" | "letter";

export type InputAnimationType = "color";

export type InputAnimationSteps = string | string[] | { [key: number]: string };

export interface InputAnimationSync {
  duration: number;
  location: number | "start" | "middle" | "end";
}

export interface InputAnimation {
  scope: InputAnimationScope;
  type: InputAnimationType;
  steps: InputAnimationSteps;

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

  offset?: number;
  sync?: InputAnimationSync;
}

// Animation
// TODO replace ver and hor with translate
export type AnimationType = "color";

export interface AnimationSteps {
  [key: number]: string | null;
}

export interface Animation {
  type: AnimationType;
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
