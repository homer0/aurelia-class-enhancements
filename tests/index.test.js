jest.unmock('/src/index');

require('jasmine-expect');
const enhance = require('/src/index');

describe('aurelia-hovm', () => {
  const delayExec = (fn) => new Promise((resolve) => {
    setTimeout(() => {
      fn();
      resolve();
    }, 1);
  });

  it('should enhance a view model and call the methods from the hovms', () => {
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

  it('should enhance a view model and call the methods from the hovms (promise)', () => {
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

  it('should enhance a view model and merge the hovms dependencies', () => {
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
    let sut = null;
    // When
    Sut = enhance(Enhancement)(Base);
    dependencies = Sut.inject;
    sut = new Sut(...dependencies);
    // Then
    expect(sut).toBeInstanceOf(Base);
    expect(dependencies).toEqual([
      services.depOne,
      services.depThree,
      services.depFive,
      services.depSix,
      services.depTwo,
      services.depFour,
    ]);
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

  it('should call a hovm method even if its not defined on the base', () => {
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
    expect(enhanceAttached).toHaveBeenCalledTimes(1);
    expect(enhanceAttached).toHaveBeenCalledWith(arg);
  });

  it('should call a base method even if its not defined on the hovm', () => {
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
    expect(baseAttached).toHaveBeenCalledTimes(1);
    expect(baseAttached).toHaveBeenCalledWith(arg);
  });

  it('shouldn\'t call hovm native methods even if they are defined', () => {
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

  it('shouldn\'t return static properties from hovm', () => {
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
});
