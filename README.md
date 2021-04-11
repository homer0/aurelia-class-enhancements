# aurelia-class-enhancements

[![GitHub Workflow Status (main)](https://img.shields.io/github/workflow/status/homer0/aurelia-class-enhancements/Test/main?style=flat-square)](https://github.com/homer0/aurelia-class-enhancements/actions?query=workflow%3ATest)
[![Coveralls github](https://img.shields.io/coveralls/github/homer0/aurelia-class-enhancements.svg?style=flat-square)](https://coveralls.io/github/homer0/aurelia-class-enhancements?branch=main)
[![David](https://img.shields.io/david/dev/homer0/aurelia-class-enhancements.svg?style=flat-square)](https://david-dm.org/homer0/aurelia-class-enhancements)

Enhance your Aurelia's classes with high order functionality

## Introduction

> If you are wondering why I built this, go to the [Motivation](#motivation) section.

Here's a really basic example of what you can achieve using this library:

```js
// myComponent.js
import enhance from 'aurelia-class-enhancements';
import LogStatus from './logStatus';

@enhance(LogStatus)
class MyComponent {}

export { MyComponent };

// logStatus.js
class LogStatus {
  attached() {
    console.log('attached :D!');
  }
  detached() {
    console.log('detached D:!');
  }
}
```

When your component gets attached to the DOM (or gets detached), via the enhancement class `LogStatus`, it will log a message on the console; all of this without having to write the functionality on your component class and without needing class inheritance.

## Usage

As you saw on the example above, the way it works is pretty straightforward:

1. Define an enhancement class with methods you want to be called when the ones of the target class are triggered.
2. Add the enhancement to the target class using the `enhance` decorator.

### Access the target class

When instantiating an enhancement, the library sends to a reference of the target class instance to the enhancement constructor, so you can access methods and properties on your custom methods.

Let's say you have a component that renders a form where the user saves some important information, and if the user were to leave the route without saving the information, you would want to use a prompt to ask for confirmation.

A basic approach would be to have a flag indicating if the changes are saved and then use the `canDeactivate` lifecycle method to decide whether to show the prompt or not:

```js
class MyForm {
  isSaved = false;
  ...
  canDeactivate() {
    // If everything is saved, go away.
    if (isSaved) {
      return true;
    }

    // Let's make the prompt async.
    return new Promise((resolve) => {
      // ask for the user confirmation.
      const answer = confirm('Confirm that you want to leave without saving');
      // resolve the promise with the answer.
      resolve(answer);
    });
  }
}

export { MyForm };
```

It works, is simple and you didn't have to involve any external logic. But now, what if you have to implement this same logic on four more forms? That's when an enhancement is useful.

Let's write an enhancement that uses the reference for the ViewModel in order to verify if the user needs to be prompted.

```js
class FormConfirmation {
  constructor(viewModel) {
    this._viewModel = viewModel;
  }

  canDeactivate() {
    if (this._viewModel.isSaved) {
      return true;
    }

    return new Promise((resolve) => {
      const answer = confirm('Confirm that you want to leave without saving');
      resolve(answer);
    });
  }
}
```

It's the same functionality, but it now checks the `isSaved` property form the ViewModel.

> In this case it was really easy because the property is a `boolean` and the `if` checks with _falsy_, but we could've check if the property was defined and use a different default, like "if the ViewModel doesn't have the property, the user can always leave without confirmation".

Ok, let's add it to the form:

```js
import enhance from 'aurelia-class-enhancements';
import { FormConfirmation } from '...';

@enhance(FormConfirmation)
class MyForm {
  isSaved = false;
  ...
}

export { MyForm };
```

And that's all, you can now add it to the other four forms using the enhancement.

### Dependency injection

Just like on any other class you use in the Aurelia context, you can use the `@inject` decorator on an enhancement in order to inject dependencies.

We'll use the enhancement from the first example and trigger an event before the log messages.

```js
import { inject } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';

@inject(EventAggregator);
class LogStatus {
  constructor(viewModel, ea) {
    this._viewModel = viewModel;
    this._ea = ea;
  }
  attached() {
    this._ea.publish('something:attached', this._viewModel);
    console.log('attached :D!');
  }
  detached() {
    this._ea.publish('something:detached', this._viewModel);
    console.log('detached D:!');
  }
}
```

### Enhance an enhancement

Since the library was made to enhance any kind of class, that means that you could also enhance an enhancement class.

Let's take the example about dependency injection and move the events part to another enhancement:

```js
import { inject } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';

@inject(EventAggregator);
class PublishStatus {
  constructor(viewModel, ea) {
    this._viewModel = viewModel;
    this._ea = ea;
  }
  attached() {
    this._ea.publish('something:attached', this._viewModel);
  }
  detached() {
    this._ea.publish('something:detached', this._viewModel);
  }
}

export { PublishStatus };
```

Now we can create an enhanced `LogStatus` with `PublishStatus`:

```js
import enhance from 'aurelia-class-enhancements';
import { PublishStatus } from '...';

@enhance(PublishStatus)
class LogStatus {
  attached() {
    console.log('attached :D!');
  }
  detached() {
    console.log('detached D:!');
  }
}
```

That was just to prove the point that you can enhance an enhancement, but there are two other, and simpler, ways in which you can achieve the same result:

#### The decorator as a function

Decorators are just functions, in this case, a function that returns a function:

```js
enhance(...Enhancements)(TargetClass): Proxy<TargetClass>
```

So, instead of enhancing `LogStatus` with `PublishStatus`, we can create a new enhancement with both of them:

```js
import enhance from 'aurelia-class-enhancements';
import { LogStatus } from '...';
import { PublishStatus } from '...';

export const PublishAndLogStatus = enhance(PublishStatus)(LogStatus);
```

#### Multiple enhancements at once

The `enhance` decorator supports multiple enhancements as parameters, so we could just send `LogStatus` and then `PublishStatus` to the class with want to enhance and the result would be the same:

```js
import enhance from 'aurelia-class-enhancements';
import { LogStatus } from '...';
import { PublishStatus } from '...';

@enhance(LogStatus, PublishStatus)
class MyComponent {}
```

### Lifecycle method

Let's say we have this enhancement:

```js
class FormConfirmation {
  constructor(viewModel) {
    this._viewModel = viewModel;
  }

  canDeactivate() {
    if (this._viewModel.isSaved) {
      return true;
    }

    return new Promise((resolve) => {
      const answer = confirm('Confirm that you want to leave without saving');
      resolve(answer);
    });
  }
}
```

But on the ViewModel, you want to add some other functionality that also needs to run on the `canDeactivate`, but only if the enhanced method returned `false`.

Modifying the signature of the enhanced method to add an extra parameter wasn't an option, as it could end up messing up methods with optional parameters.

The easiest way to solve this was adding a _lifecycle method_ the library will call, if defined, with whatever was returned from the enhanced method.

The name of the method is dynamically generated based on the name of the original method: `enhanced[OriginalMethodName]Return` (even if the method name starts with lowercase, the library will make the first letter uppercase).

This is its signature:

```js
enhancedCanDeactivateReturn(value, enhancementInstance): void
```

## ES Modules

All files are written using commonjs, as I targeted the oldest Node LTS, and it doesn't support modules (without a flag) yet, but you can still use it with ESM.

When the package gets published, an ESM version is generated on the path `/esm`. If you are using the latest version of Node, or a module bundler (like [projext](https://projextjs.com) :D), instead of requiring from the package's root path, you should do it from the `/esm` sub path:

```js
// commonjs
const enhance = require('aurelia-class-enhancements');

// ESM
import enhance from 'aurelia-class-enhancements/esm';
```

Since the next LTS to become "the oldest" is 12, which still uses the flag, I still have no plans on going with ESM by default.

## Development

### NPM/Yarn tasks

| Task       | Description                         |
|------------|-------------------------------------|
| `test`     | Run the project unit tests.         |
| `lint`     | Lint the modified files.            |
| `lint:all` | Lint the entire project code.       |
| `docs`     | Generate the project documentation. |
| `todo`     | List all the pending to-do's.       |

### Repository hooks

I use [`husky`](https://yarnpkg.com/package/husky) to automatically install the repository hooks so...

1. The code will be formatted and linted before any commit.
2. The dependencies will be updated after every merge.
3. The tests will run before pushing.

#### Commits convention

I use [conventional commits](https://www.conventionalcommits.org) with [`commitizen`](https://yarnpkg.com/package/commitizen) in order to support semantic releases. The one that sets it up is actually husky, it installs a script that runs commitizen on the `git commit` command.

The hook for this is on `./utils/hooks/prepare-commit-msg` and the configuration for comitizen is on the `config.commitizen` property of the `package.json`.

### Releases

I use [`semantic-release`](https://yarnpkg.com/package/semantic-release) and a GitHub action to automatically release on NPM everything that gets merged to main.

The configuration for `semantic-release` is on `./releaserc` and the workflow for the release is on `./.github/workflow/release.yml`.

### Testing

I use [Jest](https://facebook.github.io/jest/) to test the project.

The configuration file is on `./.jestrc.js`, the tests are on `./tests` and the script that runs it is on `./utils/scripts/test`.

### Linting

I use [ESlint](http://eslint.org) with [my own custom configuration](http://yarnpkg.com/en/package/eslint-plugin-homer0) to validate all the JS code. The configuration file for the project code is on `./.eslintrc` and the one for the tests is on `./tests/.eslintrc`. There's also an `./.eslintignore` to exclude some files on the process. The script that runs it is on `./utils/scripts/lint`.

### Documentation

I use [JSDoc](https://jsdoc.app) to generate an HTML documentation site for the project.

The configuration file is on `./.jsdoc.js` and the script that runs it is on `./utils/scripts/docs`.

### To-Dos

I use `@todo` comments to write all the pending improvements and fixes, and [Leasot](https://yarnpkg.com/en/package/leasot) to generate a report. The script that runs it is on `./utils/scripts/todo`.

## Motivation

> I put this at the end because no one usually reads it :P.

The example about prompting the user when there's a form unsaved was a real case requirement for me, and while discussing which would be the best approach to implement it, there were three conclusions:

1. OOP inheritance on the ViewModels sounds like a terrible idea; and you are limited to only one "enhancement".
2. Mixins on "real classes" was a no-go.
3. It should be something like React's high order components (I know high order functionality is not specific to React, but that's where it shines).

So, I wanted something similar to React's HOCs, but for classes, and a little bit closer to a HOF (function), since there's no JSX on Aurelia.

Lately, I've been playing around with Proxies on some of my other libraries, and they are **really powerful**; so I thought I could use a proxy on top of a class and the only complicated part would be to solve the dependency injection, as I wanted the enhancements to be able to access other services.

I got a prototype working and that's when I realized that Aurelia makes "heavy use" of decorators, so instead of having a function to enhance the class before exporting it (like the React approach), I could "decorate the class":

```js
@enhance(MyEnhancement)
class MyComponent {}
```

Yay :D!

