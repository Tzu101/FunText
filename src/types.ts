/*
  OPTIONS
*/

// Input option
type DefaultProperties = Omit<AnimationProperties, "scope">;

interface NodeTags {
  container?: string;
  text?: string;
  break?: string;
}

interface CSSClasses {
  global?: string;
  root?: string;
  container?: string;
  text?: string;
  break?: string;
  raw?: string;
}

interface Accessibility {
  aria?: boolean;
  prefersContrast?: number;
  prefersReducedMotion?: boolean;
  prefersColorScheme?: boolean;
}

export interface InputOptions {
  text?: string;
  defaults?: DefaultProperties;
  nodes?: NodeTags;
  css?: CSSClasses;
  altcss?: CSSClasses;
  attributes?: { [key: string]: string };
  accessibility?: Accessibility;
  openMode?: boolean;
}

// Options
export interface Options {
  text: string | undefined;
  defaults: Required<DefaultProperties>;
  nodes: Required<NodeTags>;
  css: Required<CSSClasses>;
  altcss: Required<CSSClasses>;
  attributes: { [key: string]: string };
  accessibility: Required<Accessibility>;
  openMode: boolean;
}

/*
  ANIMATION
*/

// Input animation
export interface InputAnimationSync {
  duration: number;
  location: number | "start" | "middle" | "end";
}

type worlet = "word" | "letter";
export type InputScope =
  | worlet
  | {
      split: string | RegExp;
      priority: number;
    };

interface AnimationProperties {
  scope: InputScope;

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
  fill?: "none" | "forwards" | "backwards" | "both" | "initial" | "inherit";
  state?: "running" | "paused";

  offset?: number | AnimationOffset;
  sync?: InputAnimationSync;
}

type strnum = string | number;
export type InputAnimationSteps = strnum | strnum[] | AnimationSteps;

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
export interface FinalScope {
  split: string | RegExp;
  priority: number;
}

export interface AnimationSteps {
  [key: number]: strnum | null;
}

export type AnimationOffset = (priority: number, index: number) => number;

export interface Animation {
  scope: FinalScope;
  property: string;
  steps: AnimationSteps;

  duration: number;
  delay: number;
  iteration: string;
  direction: string;
  timing: string;
  fill: string;
  state: string;

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
  state: string;
}

export type KeyframeAnimations = { [key: string]: KeyframeAnimation[] };

// Elements
export interface FunTextElement {
  tag: string;
  classes: string[];
  children: string | FunTextElement[];
  variables: [string, string][];
}

// FunText
export interface AnimationId {
  scope: number;
  property: string;
}
