import { frameworkMap } from '../constant.js';

export type Framework = (typeof frameworkMap)[keyof typeof frameworkMap];
