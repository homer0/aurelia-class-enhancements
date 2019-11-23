/**
 * @external {Class} https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes
 */

/**
 * @typdef {function} DecoratorCallback
 * @param {Class} Target The ViewModel to enhance.
 * @return {Class} A proxied version of the `Target`.
 */

/**
 * @typedef {function} GetDependencies
 * @param {Array} list All the dependencies Aurelia returned, for both the ViewModel and the
 *                     enhancement class.
 * @return {Array} A list of dependencies for the requested case, be the ViewModel or the
 *                 enhancement class.
 * @ignore
 */

/**
 * These are necessary resources for the `isNativeFn` function.
 * @ignore
 */
const { toString } = Object.prototype;
/**
 * @ignore
 */
const { toString: fnToString } = Function.prototype;
/**
 * @ignore
 */
const reBase = String(toString)
.replace(/[.*+?^${}()|[\]\/\\]/g, '\\$&')
.replace(/toString|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?');
/**
 * @ignore
 */
const reNative = RegExp(`^${reBase}$`);
/**
 * Checks whether a function is native or not.
 * @param {function} fn The function to validate.
 * @return {Boolean}
 * @see https://davidwalsh.name/detect-native-function
 * @ignore
 */
const isNativeFn = (fn) => fnToString.call(fn).match(reNative);
/**
 * This utility function takes care of generating a unique list of dependencies for both, the
 * ViewModel and the class that enhances it. It then provides methods to extract the dependencies
 * of each one when Aurelia is done instantiating them.
 * @param {Array} [target=[]]      The list of dependencies for the ViewModel.
 * @param {Array} [enhancement=[]] The list of dependencies for the enhance class.
 * @return {Object}
 * @property {Array}           list              The unique list of all the dependencies both
 *                                               classes need.
 * @property {GetDependencies} getForTarget      Given the list of all the obtained dependencies,
 *                                               it filters the ones needed for the ViewModel
 *                                               class.
 * @property {GetDependencies} getForEnhancement Given the list of all the obtained dependencies,
 *                                               it filters the ones needed for the enhancement
 *                                               class.
 * @ignore
 */
const getInjectData = (target = [], enhancement = []) => {
  const list = target.slice();
  const enhancementPositions = {};
  enhancement.forEach((dep) => {
    const targetIndex = list.indexOf(dep);
    if (targetIndex > -1) {
      enhancementPositions[dep] = targetIndex;
    } else {
      list.push(dep);
      enhancementPositions[dep] = list.length - 1;
    }
  });

  return {
    list,
    getForTarget: (values) => values.slice(0, target.length),
    getForEnhancement: (values) => enhancement.map((dep) => (
      values[enhancementPositions[dep]]
    )),
  };
};
/**
 * This is called from the proxy created on {@link enhanceInstance} when the target instance
 * and the enhance instance implements the samemethod.
 * The function will call first the enhance function and, if the returned value is a promise,
 * it will call the target function after it gets resolved; otherwise, it will call it immediately
 * after.
 * @param {function} target      The method that was called from the ViewModel.
 * @param {function} enhancement The version of the method from the enhancement class.
 * @return {function} A version of the method that calls both, the enhancement and the original.
 * @ignore
 */
const composeMethod = (target, enhancement) => (...args) => {
  const enhanced = enhancement(...args);
  return enhanced && typeof enhanced.then === 'function' ?
    enhanced.then(() => target(...args)) :
    target(...args);
};
/**
 * Creates a proxy for a ViewModel instance so when a method is called, it will check if the
 * enhancement class implements its in order to trigger that one before the original.
 * @param {Object} target      The ViewModel instance to proxy.
 * @param {Object} enhancement The instance that will add methods to the ViewModel.
 * @return {Object} A proxied version of the `target`.
 * @ignore
 */
const enhanceInstance = (target, enhancement) => new Proxy(target, {
  get: (targetCls, name) => {
    let result;
    const targetValue = targetCls[name];
    const targetIsFn = typeof targetValue === 'function';
    const enhancementValue = enhancement[name];
    const enhancementIsFn = typeof enhancementValue === 'function';
    if (targetIsFn && isNativeFn(targetValue)) {
      result = targetValue;
    } else if (enhancementIsFn) {
      result = targetIsFn ?
        composeMethod(targetValue, enhancementValue) :
        enhancementValue;
    } else {
      result = targetValue;
    }

    return result;
  },
});
/**
 * Creates a proxy from a target ViewModel declaration in order to:
 * 1. Concatenate the list of dependencies both classes need.
 * 2. Instance both the ViewModel and the enhancement class, sending the right dependencies.
 * @param {Class} Target      The ViewModel to proxy.
 * @param {Class} Enhancement The class that will add methods to the ViewModel.
 * @return {Class} A proxied version of the `Target`.
 * @ignore
 */
const composeWith = (Target, Enhancement) => {
  const injectData = getInjectData(Target.inject, Enhancement.inject);
  return new Proxy(Target, {
    construct: (TargetCls, args) => {
      const targetInstance = new TargetCls(...injectData.getForTarget(args));
      const enhancementInstance = new Enhancement(
        targetInstance,
        ...injectData.getForEnhancement(args)
      );

      return enhanceInstance(targetInstance, enhancementInstance);
    },
    get: (target, name) => (
      name === 'inject' ?
        injectData.list :
        target[name]
    ),
  });
};
/**
 * Enhances an Aurelia's ViewModel class with another classes.
 * @param {Class}    Target       The ViewModel to enhance.
 * @param {...Class} enhancements The class or list of classes to enhance the ViewModel.
 * @return {Class} A proxied version of the `Target`.
 */
const composeViewModel = (Target, ...enhancements) => enhancements.reduce(
  (Current, Enhancement) => composeWith(Current, Enhancement),
  Target
);

/**
 * This is the decorator version of {@link composeViewModel}. It allows you enhance an Aurelia's
 * ViewModel class with another classes.
 * @param {...Class} enhancements The class or list of classes to enhance the ViewModel.
 * @return {DecoratorCallback}
 */
const compose = (...enhancements) => (Target) => composeViewModel(
  Target,
  ...enhancements
);

module.exports = {
  compose,
  composeViewModel,
};
