jest.unmock('/src/index');

require('jasmine-expect');
const enhance = require('/src/index');

describe('aurelia-class-enhancements', () => {
  const delayExec = (fn) => new Promise((resolve) => {
    setTimeout(() => {
      resolve(fn());
    }, 1);
  });

  it('should enhance a view model and call the methods from the enhancements', () => {
    // Given
    const callQueue = [];
    const baseId = 'base-vm';
    const baseAttached = jest.fn();
    class Base {
      attached(...args) {
        callQueue.push(baseId);
        return baseAttached(...args);
      }
    }
    const enhOneId = 'enh-one-vm';
    const enhOneAttached = jest.fn();
    class EnhancementOne {
      attached(...args) {
        callQueue.push(enhOneId);
        return enhOneAttached(...args);
      }
    }
    const enhTwoId = 'enh-two-vm';
    const enhTwoAttached = jest.fn();
    class EnhancementTwo {
      attached(...args) {
        callQueue.push(enhTwoId);
        return enhTwoAttached(...args);
      }
    }
    const arg = 'hello world!';
    let sut = null;
    // When
    sut = new (enhance(EnhancementOne, EnhancementTwo)(Base))();
    sut.attached(arg);
    // Then
    expect(sut).toBeInstanceOf(Base);
    expect(callQueue).toEqual([
      enhTwoId,
      enhOneId,
      baseId,
    ]);
    expect(enhTwoAttached).toHaveBeenCalledTimes(1);
    expect(enhTwoAttached).toHaveBeenCalledWith(arg);
    expect(enhOneAttached).toHaveBeenCalledTimes(1);
    expect(enhOneAttached).toHaveBeenCalledWith(arg);
    expect(baseAttached).toHaveBeenCalledTimes(1);
    expect(baseAttached).toHaveBeenCalledWith(arg);
  });

  it('should recive the "enhanced returns" on a lifecycle method', () => {
    // Given
    const baseId = 'base-vm';
    const baseAttached = jest.fn(() => baseId);
    const baseAttachedLifeCycle = jest.fn();
    class Base {
      attached(...args) {
        return baseAttached(...args);
      }

      enhancedAttachedReturn(...args) {
        baseAttachedLifeCycle(...args);
      }
    }
    const enhId = 'enh-one-vm';
    const enhAttached = jest.fn(() => enhId);
    class Enhancement {
      attached(...args) {
        return enhAttached(...args);
      }
    }
    const arg = 'hello world!';
    let sut = null;
    let result = null;
    // When
    sut = new (enhance(Enhancement)(Base))();
    result = sut.attached(arg);
    // Then
    expect(result).toBe(baseId);
    expect(enhAttached).toHaveBeenCalledTimes(1);
    expect(enhAttached).toHaveBeenCalledWith(arg);
    expect(baseAttached).toHaveBeenCalledTimes(1);
    expect(baseAttached).toHaveBeenCalledWith(arg);
    expect(baseAttachedLifeCycle).toHaveBeenCalledTimes(1);
    expect(baseAttachedLifeCycle).toHaveBeenCalledWith(enhId, expect.any(Enhancement));
  });

  it('should enhance a view model that was already enhanced', () => {
    // Given
    const callQueue = [];
    const baseId = 'base-vm';
    const baseAttached = jest.fn();
    class Base {
      attached(...args) {
        callQueue.push(baseId);
        return baseAttached(...args);
      }
    }
    const enhOneId = 'enh-one-vm';
    const enhOneAttached = jest.fn();
    class EnhancementOne {
      attached(...args) {
        callQueue.push(enhOneId);
        return enhOneAttached(...args);
      }
    }
    const enhTwoId = 'enh-one-vm';
    const enhTwoAttached = jest.fn();
    class EnhancementTwo {
      attached(...args) {
        callQueue.push(enhTwoId);
        return enhTwoAttached(...args);
      }
    }
    const arg = 'hello world!';
    let sut = null;
    // When
    sut = new (enhance(EnhancementTwo)(enhance(EnhancementOne)(Base)))();
    sut.attached(arg);
    // Then
    expect(sut).toBeInstanceOf(Base);
    expect(callQueue).toEqual([
      enhTwoId,
      enhOneId,
      baseId,
    ]);
  });

  it('should enhance a view model and call the methods from the enhancements (promise)', () => {
    // Given
    const callQueue = [];
    const baseId = 'base-vm';
    const baseAttached = jest.fn();
    class Base {
      attached(...args) {
        return delayExec(() => {
          callQueue.push(baseId);
          return baseAttached(...args);
        });
      }
    }
    const enhOneId = 'enh-one-vm';
    const enhOneAttached = jest.fn();
    class EnhancementOne {
      attached(...args) {
        return delayExec(() => {
          callQueue.push(enhOneId);
          return enhOneAttached(...args);
        });
      }
    }
    const enhTwoId = 'enh-two-vm';
    const enhTwoAttached = jest.fn();
    class EnhancementTwo {
      attached(...args) {
        return delayExec(() => {
          callQueue.push(enhTwoId);
          return enhTwoAttached(...args);
        });
      }
    }
    const arg = [];
    let sut = null;
    // When
    sut = new (enhance(EnhancementOne, EnhancementTwo)(Base))();
    return sut.attached(arg)
    .then(() => {
      // Then
      expect(callQueue).toEqual([
        enhTwoId,
        enhOneId,
        baseId,
      ]);
      expect(enhTwoAttached).toHaveBeenCalledTimes(1);
      expect(enhTwoAttached).toHaveBeenCalledWith(arg);
      expect(enhOneAttached).toHaveBeenCalledTimes(1);
      expect(enhOneAttached).toHaveBeenCalledWith(arg);
      expect(baseAttached).toHaveBeenCalledTimes(1);
      expect(baseAttached).toHaveBeenCalledWith(arg);
    });
  });

  it('should recive the "enhanced returns" on a lifecycle method (promise)', () => {
    // Given
    const baseId = 'base-vm';
    const baseAttached = jest.fn(() => baseId);
    const baseAttachedLifeCycle = jest.fn();
    class Base {
      attached(...args) {
        return delayExec(() => baseAttached(...args));
      }

      enhancedAttachedReturn(...args) {
        baseAttachedLifeCycle(...args);
      }
    }
    const enhId = 'enh-one-vm';
    const enhAttached = jest.fn(() => enhId);
    class Enhancement {
      attached(...args) {
        return delayExec(() => enhAttached(...args));
      }
    }
    const arg = 'hello world!';
    let sut = null;
    // When
    sut = new (enhance(Enhancement)(Base))();
    return sut.attached(arg).then((result) => {
      // Then
      expect(result).toBe(baseId);
      expect(enhAttached).toHaveBeenCalledTimes(1);
      expect(enhAttached).toHaveBeenCalledWith(arg);
      expect(baseAttached).toHaveBeenCalledTimes(1);
      expect(baseAttached).toHaveBeenCalledWith(arg);
      expect(baseAttachedLifeCycle).toHaveBeenCalledTimes(1);
      expect(baseAttachedLifeCycle).toHaveBeenCalledWith(enhId, expect.any(Enhancement));
    });
  });

  it('should enhance a view model and merge the enhancements dependencies', () => {
    // Given
    const services = {
      depOne: 'dep-one',
      depTwo: 'dep-two',
      depThree: 'dep-three',
      depFour: 'dep-four',
      depFive: 'dep-five',
      depSix: 'dep-six',
    };
    const baseConstructor = jest.fn();
    class Base {
      constructor(...args) {
        baseConstructor(...args);
      }
    }
    Base.inject = [
      services.depOne,
      services.depThree,
      services.depFive,
      services.depSix,
    ];
    Base.otherStaticProperty = 'something';
    const enhanceConstructor = jest.fn();
    class Enhancement {
      constructor(...args) {
        enhanceConstructor(...args);
      }
    }
    Enhancement.inject = [
      services.depOne,
      services.depTwo,
      services.depFour,
      services.depFive,
    ];
    let Sut = null;
    let dependencies = null;
    let dependenciesDescription = null;
    let otherPropertyDescription = null;
    let sut = null;
    const expectedDependencies = [
      services.depOne,
      services.depThree,
      services.depFive,
      services.depSix,
      services.depTwo,
      services.depFour,
    ];
    // When
    Sut = enhance(Enhancement)(Base);
    dependencies = Sut.inject;
    dependenciesDescription = Object.getOwnPropertyDescriptor(Sut, 'inject');
    otherPropertyDescription = Object.getOwnPropertyDescriptor(Sut, 'otherStaticProperty');
    sut = new Sut(...dependencies);
    // Then
    expect(sut).toBeInstanceOf(Base);
    expect(dependencies).toEqual(expectedDependencies);
    expect(dependenciesDescription).toEqual({
      configurable: true,
      enumerable: true,
      writable: false,
      value: expectedDependencies,
    });
    expect(otherPropertyDescription).toEqual({
      configurable: true,
      enumerable: true,
      writable: true,
      value: Base.otherStaticProperty,
    });
    expect(baseConstructor).toHaveBeenCalledTimes(1);
    expect(baseConstructor).toHaveBeenCalledWith(
      services.depOne,
      services.depThree,
      services.depFive,
      services.depSix
    );
    expect(enhanceConstructor).toHaveBeenCalledTimes(1);
    expect(enhanceConstructor).toHaveBeenCalledWith(
      expect.any(Base),
      services.depOne,
      services.depTwo,
      services.depFour,
      services.depFive
    );
  });

  it('should return the Proxy class when calling an enhanced instance constructor', () => {
    // Given
    class Base {}
    class Enhancement {}
    let Sut = null;
    let sut = null;
    // When
    Sut = enhance(Enhancement)(Base);
    sut = new Sut();
    // Then
    expect(sut).toBeInstanceOf(Base);
    expect(sut.constructor).toBe(Sut);
  });

  it('should call a enhanced method even if its not defined on the base', () => {
    // Given
    class Base {}
    const enhanceAttached = jest.fn();
    class Enhancement {
      attached(...args) {
        return enhanceAttached(...args);
      }
    }
    const arg = 'hello world!';
    let sut = null;
    // When
    sut = new (enhance(Enhancement)(Base))();
    sut.attached(arg);
    // Then
    expect(sut).toBeInstanceOf(Base);
    expect('attached' in sut).toBeTrue();
    expect(enhanceAttached).toHaveBeenCalledTimes(1);
    expect(enhanceAttached).toHaveBeenCalledWith(arg);
  });

  it('should call a enhanced method even if its not defined on the base (promise)', () => {
    // Given
    class Base {}
    const enhanceAttached = jest.fn();
    class Enhancement {
      attached(...args) {
        return delayExec(() => enhanceAttached(...args));
      }
    }
    const arg = 'hello world!';
    let sut = null;
    // When
    sut = new (enhance(Enhancement)(Base))();
    return sut.attached(arg)
    .then(() => {
      // Then
      expect(sut).toBeInstanceOf(Base);
      expect(enhanceAttached).toHaveBeenCalledTimes(1);
      expect(enhanceAttached).toHaveBeenCalledWith(arg);
    });
  });

  it('should call a base method even if its not defined on the enhancement', () => {
    // Given
    const baseAttached = jest.fn();
    class Base {
      attached(...args) {
        return baseAttached(...args);
      }
    }
    class Enhancement {}
    const arg = 'hello world!';
    let sut = null;
    // When
    sut = new (enhance(Enhancement)(Base))();
    sut.attached(arg);
    // Then
    expect(sut).toBeInstanceOf(Base);
    expect('attached' in sut).toBeTrue();
    expect(baseAttached).toHaveBeenCalledTimes(1);
    expect(baseAttached).toHaveBeenCalledWith(arg);
  });

  it('shouldn\'t call an enhancement native methods even if they are defined', () => {
    // Given
    class Base {}
    const enhanceToString = jest.fn();
    class Enhancement {
      toString(...args) {
        return enhanceToString(...args);
      }
    }
    let sut = null;
    let result = null;
    // When
    sut = new (enhance(Enhancement)(Base))();
    result = sut.toString();
    // Then
    expect(sut).toBeInstanceOf(Base);
    expect(result).toBe('[object Object]');
    expect(enhanceToString).toHaveBeenCalledTimes(0);
  });

  it('shouldn\'t return static properties from an enhancement', () => {
    // Given
    class Base {}
    Base.staticProp = 'base';
    const enhanceToString = jest.fn();
    class Enhancement {
      toString(...args) {
        return enhanceToString(...args);
      }
    }
    Enhancement.staticProp = 'enhance';
    let Sut = null;
    let result = null;
    // When
    Sut = enhance(Enhancement)(Base);
    result = Sut.staticProp;
    // Then
    expect(result).toBe(Base.staticProp);
  });

  it('should have descriptions for both, the enhancement and the target, properties', () => {
    // Given
    const baseProperty = 'baseId';
    const basePropertyValue = 'base';
    const enhancedProperty = 'id';
    const enhancedPropertyBaseValue = 'base';
    class Base {
      constructor() {
        this[baseProperty] = basePropertyValue;
        this[enhancedProperty] = enhancedPropertyBaseValue;
      }
    }
    const enhancedPropertyValue = 'enhanced';
    class Enhancement {
      constructor() {
        this[enhancedProperty] = enhancedPropertyValue;
      }
    }
    let sut = null;
    let basePropertyDescription = null;
    let enhancedPropertyDescription = null;
    // When
    sut = new (enhance(Enhancement)(Base))();
    basePropertyDescription = Object.getOwnPropertyDescriptor(sut, baseProperty);
    enhancedPropertyDescription = Object.getOwnPropertyDescriptor(sut, enhancedProperty);
    // Then
    expect(basePropertyDescription).toEqual({
      configurable: true,
      enumerable: true,
      writable: true,
      value: basePropertyValue,
    });
    expect(enhancedPropertyDescription).toEqual({
      configurable: true,
      enumerable: true,
      writable: true,
      value: enhancedPropertyValue,
    });
  });

  it('should have merge both keys, from the target and the enhancement, for Object.keys', () => {
    // Given
    const baseProperty = 'baseId';
    const enhancedProperty = 'id';
    class Base {
      constructor() {
        this[baseProperty] = null;
        this[enhancedProperty] = null;
      }
    }
    class Enhancement {
      constructor() {
        this[enhancedProperty] = null;
      }
    }
    let sut = null;
    let result = null;
    // When
    sut = new (enhance(Enhancement)(Base))();
    result = Object.keys(sut);
    // Then
    expect(result).toEqual([
      baseProperty,
      enhancedProperty,
    ]);
  });
});
