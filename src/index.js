const { toString } = Object.prototype;
const { toString: fnToString } = Function.prototype;
const reBase = String(toString)
.replace(/[.*+?^${}()|[\]\/\\]/g, '\\$&')
.replace(/toString|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?');
const reNative = RegExp(`^${reBase}$`);

const isNativeFn = (fn) => fnToString.call(fn).match(reNative);

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

const composeMethod = (target, enhancement) => (...args) => {
  const enhanced = enhancement(...args);
  return enhanced && typeof enhanced.then === 'function' ?
    enhanced.then(() => target(...args)) :
    target(...args);
};

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

const composeViewModel = (Target, ...enhancements) => enhancements.reduce(
  (Current, Enhancement) => composeWith(Current, Enhancement),
  Target
);

const compose = (...enhancements) => (Target) => composeViewModel(
  Target,
  ...enhancements
);

module.exports = new Proxy(compose, {
  get: (target, name) => (
    name === 'composeViewModel' ?
      composeViewModel :
      target[name]
  ),
});
