/**
 * @external Class
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes
 */

/**
 * @callback EnhancementCreator
 * @param {Class} Target  The class to enhance.
 * @returns {Proxy<Class>} A proxied version of the `Target`.
 */

/**
 * @callback GetDependencies
 * @param {Array} list  All the dependencies Aurelia returned, for both the target class
 *                      and the enhancement class.
 * @returns {Array} A list of dependencies for the requested case, be the target class or
 *                  the enhancement class.
 * @ignore
 */

/**
 * @typedef {Object} InjectData
 * @property {Array}           list               The unique list of all the dependencies
 *                                                both classes need.
 * @property {GetDependencies} getForTarget       Given the list of all the obtained
 *                                                dependencies,
 *                                                it filters the ones needed for the
 *                                                target class.
 * @property {GetDependencies} getForEnhancement  Given the list of all the obtained
 *                                                dependencies,
 *                                                it filters the ones needed for the
 *                                                enhancement class.
 * @ignore
 */

/**
 * These are necessary resources for the `isNativeFn` function.
 *
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
 *
 * @param {Function} fn  The function to validate.
 * @returns {boolean}
 * @see https://davidwalsh.name/detect-native-function
 * @ignore
 */
const isNativeFn = (fn) => fnToString.call(fn).match(reNative);
/**
 * This utility function takes care of generating a unique list of dependencies for both,
 * the target and the class that enhances it. It then provides methods to extract the
 * dependencies of each one when Aurelia is done instantiating them.
 *
 * @param {Array} [target=[]]       The list of dependencies for the target class.
 * @param {Array} [enhancement=[]]  The list of dependencies for the enhance class.
 * @returns {InjectData}
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
    /**
     * Given the list of all the obtained dependencies, it filters the ones needed for the
     * target class.
     *
     * @type {GetDependencies}
     * @ignore
     */
    getForTarget: (values) => values.slice(0, target.length),
    /**
     * Given the list of all the obtained dependencies, it filters the ones needed for the
     * enhancement class.
     *
     * @type {GetDependencies}
     * @ignore
     */
    getForEnhancement: (values) =>
      enhancement.map((dep) => values[enhancementPositions[dep]]),
  };
};
/**
 * This is called from the proxy created on {@link enhanceInstance} when the enhancement
 * implements a method of the target that is being requested.
 * The function will first call the enhanced method, then evaluate whether it should
 * resolved as a promise (becuase the method returned a `Promise`) or sync, check if the
 * target implements the lifecycle method to recive what the enhancement returned and
 * finally, call the original method.
 *
 * @param {Object}  target       The target class instance.
 * @param {Object}  enhancement  The instance with the enhanced methods.
 * @param {string}  name         The name of the method being requested.
 * @param {boolean} callTarget   Whether or not the target method should be called.
 * @returns {Function} A version of the method that calls both, the enhancement and the
 *                     original.
 * @ignore
 */
const composeMethod = (target, enhancement, name, callTarget) => (...args) => {
  const enhancedMethod = enhancement[name];
  const enhancedValue = enhancedMethod.bind(enhancement)(...args);
  const normalizedName = name.replace(/^[a-z]/, (match) => match.toUpperCase());
  const lcMethodName = `enhanced${normalizedName}Return`;
  const hasLCMethod = typeof target[lcMethodName] === 'function';
  let result;
  const isPromise = enhancedValue && typeof enhancedValue.then === 'function';
  if (isPromise) {
    result = enhancedValue.then((value) => {
      if (hasLCMethod) {
        target[lcMethodName].bind(target)(value, enhancement);
      }

      return callTarget ? target[name](...args) : value;
    });
  } else {
    if (hasLCMethod) {
      target[lcMethodName].bind(target)(enhancedValue, enhancement);
    }

    result = callTarget ? target[name].bind(target)(...args) : enhancedValue;
  }

  return result;
};
/**
 * Creates a proxy for a target class instance so when a method is called, it will check
 * if the enhancement class implements its in order to trigger that one before the
 * original.
 *
 * @param {Class}  ProxyClass   The definition of the proxy class. This is needed in order
 *                              to return it when Aurelia asks for the instance
 *                              constructor.
 * @param {Object} target       The target class instance to proxy.
 * @param {Object} enhancement  The instance that will add methods to the target class.
 * @returns {Object} A proxied version of the `target`.
 * @ignore
 */
const enhanceInstance = (ProxyClass, target, enhancement) =>
  new Proxy(target, {
    /**
     * This a proxy trap for when the implementation tries to access a property of the
     * proxy.
     * It validates if its the constructor, in order to return the `ProxyClass`, then
     * validates if it's a native method, then if it's present on the enhancement, and
     * finally on the target class.
     *
     * @param {Object} targetCls  The original class.
     * @param {string} name       The name of the property.
     * @returns {*}
     * @ignore
     */
    get: (targetCls, name) => {
      let result;
      if (name === 'constructor') {
        result = ProxyClass;
      } else {
        const targetValue = targetCls[name];
        const targetIsFn = typeof targetValue === 'function';
        const enhancementValue = enhancement[name];
        const enhancementIsFn = typeof enhancementValue === 'function';
        if (targetIsFn && isNativeFn(targetValue)) {
          result = targetValue;
        } else if (enhancementIsFn) {
          result = composeMethod(targetCls, enhancement, name, targetIsFn);
        } else {
          result = targetValue;
        }
      }

      return result;
    },
    /**
     * This is a proxy trap for when `in` is called, it validates first on the original
     * class and then on the enhancement.
     *
     * @param {Object} targetCls  The original class.
     * @param {string} name       The name of the property.
     * @returns {boolean}
     * @ignore
     */
    has: (targetCls, name) => name in targetCls || name in enhancement,
    /**
     * This is a proxy trap for `getOwnPropertyDescriptor`, it first validates against the
     * enhancement and then does a fallback to the original class.
     *
     * @param {Object} targetCls  The original class.
     * @param {string} name       The name of the property.
     * @returns {Object}
     * @ignore
     */
    getOwnPropertyDescriptor: (targetCls, name) => {
      let result = Object.getOwnPropertyDescriptor(enhancement, name);
      if (typeof result === 'undefined') {
        result = Object.getOwnPropertyDescriptor(targetCls, name);
      }

      return result;
    },
    /**
     * This is a proxy trap for the `Object.keys` function. It gets the keys from the
     * original class and then from the enhancement.
     *
     * @param {Object} targetCls  The original class.
     * @returns {string[]}
     * @ignore
     */
    ownKeys: (targetCls) => [
      ...new Set([...Reflect.ownKeys(targetCls), ...Reflect.ownKeys(enhancement)]),
    ],
  });
/**
 * Creates a proxy from a target class declaration in order to:
 * 1. Concatenate the list of dependencies both classes need.
 * 2. Instance both the target and the enhancement classes, sending the right
 * dependencies.
 *
 * @param {Class} Target       The target class to proxy.
 * @param {Class} Enhancement  The class that will add methods to the target.
 * @returns {Class} A proxied version of the `Target`.
 * @ignore
 */
const proxyClass = (Target, Enhancement) => {
  const injectData = getInjectData(Target.inject, Enhancement.inject);
  const ProxyClass = new Proxy(Target, {
    /**
     * This is a proxy trap for the constructor; it instantiates the original class, then
     * the enhacement, creates a proxy with both together, and returns the proxy.
     *
     * @param {T}     TargetCls  The original class.
     * @param {Array} args       The arguments sent to the constructor.
     * @returns {Proxy<T>}
     * @template T  The type of the class to proxy.
     * @ignore
     */
    construct: (TargetCls, args) => {
      const targetInstance = new TargetCls(...injectData.getForTarget(args));
      const enhancementInstance = new Enhancement(
        targetInstance,
        ...injectData.getForEnhancement(args),
      );

      return enhanceInstance(ProxyClass, targetInstance, enhancementInstance);
    },
    /**
     * This a proxy trap for when the implementation tries to access a property of the
     * proxy.
     * It checks if the property is `inject` in order to return the list of dependencies
     * for both classes (original and enhancement).
     *
     * @param {Object} target  The original class.
     * @param {string} name    The name of the property.
     * @returns {*}
     * @ignore
     */
    get: (target, name) => (name === 'inject' ? injectData.list : target[name]),
    /**
     * This is a proxy trap for `getOwnPropertyDescriptor`, it's used to validate if the
     * property to access is the list of dependencies.
     *
     * @param {Object} target  The original class.
     * @param {string} name    The name of the property.
     * @returns {Object}
     * @ignore
     */
    getOwnPropertyDescriptor: (target, name) =>
      name === 'inject'
        ? {
            configurable: true,
            enumerable: true,
            value: injectData.list,
          }
        : Object.getOwnPropertyDescriptor(target, name),
  });

  return ProxyClass;
};
/**
 * Creates a function to enhance an Aurelia's class with other class(es).
 * This method has this sintax because is intended to be used as a decorator.
 *
 * @param {...Class} enhancements  The class or list of classes to enhance the target.
 * @returns {EnhancementCreator}
 * @example
 *
 * <caption>As decorator</caption>
 *
 * \@enhance(MyEnhancement)
 * class MyViewModel { ... }
 *
 * @example
 *
 * <caption>As function:</caption>
 *
 *   enhance(MyEnhancement)(MyViewModel);
 *
 */
const enhance = (...enhancements) => (Target) =>
  enhancements.reduce((Current, Enhancement) => proxyClass(Current, Enhancement), Target);

module.exports = enhance;
