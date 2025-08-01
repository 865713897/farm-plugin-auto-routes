import { frameworkMap } from '../constant.js';
import { resolveReact } from './react.js';
import { resolveVue } from './vue.js';
import { Framework } from '../types/index.js';

export function getResolver(framework: Framework) {
  switch (framework) {
    case frameworkMap.REACT:
      return resolveReact();
    case frameworkMap.VUE:
      return resolveVue();
    default:
      throw new Error(`Framework ${framework} is not supported.`);
  }
}
