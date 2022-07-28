---
title: watch
date: 2022-07-28 13:53:00
authors: NoraH1to
tags:
  - Vue
  - Vue3
  - 响应式系统
---

`watch` 第三个参数可以传入 `options` 对象，对象中 `flush` 属性可以控制回调的更新时机，分别是**组件更新前**、**组件更新后** 和 **同步触发**

从这里得知该 api 与组件渲染有关联，所以其实现不在 `@vue/reactivity` 里，而是在 `@vue/runtime-core` 中

具体路径为 `packages/runtime-core/src/apiWatch.ts`

## watch

我们跳转到 `watch` 实现，可以发现其具体实现是 [`doWatch`](#dowatch) 方法

```typescript
export function watch<T = any, Immediate extends Readonly<boolean> = false>(
  source: T | WatchSource<T>,
  cb: any,
  options?: WatchOptions<Immediate>
): WatchStopHandle {
  if (__DEV__ && !isFunction(cb)) {
    warn(
      `\`watch(fn, options?)\` signature has been moved to a separate API. ` +
        `Use \`watchEffect(fn, options?)\` instead. \`watch\` now only ` +
        `supports \`watch(source, cb, options?) signature.`
    );
  }
  return doWatch(source as any, cb, options);
}
```

一如既往的在生产环境下有控制台提示

## watchEffect

直接就是返回一个 [`doWatch`](#dowatch) 的执行结果

```typescript
export function watchEffect(
  effect: WatchEffect,
  options?: WatchOptionsBase
): WatchStopHandle {
  return doWatch(effect, null, options);
}
```

## doWatch

该方法是 `watch`,`watchEffect` 的核心实现

总共一百多行，涉及到了挺多东西

接收**三个**参数：

- `source` : 观察的源数据，可以是一个方法、单个对象、对象数组

- `cb` : `watch` 的监听回调

- `options` : 各种配置

```typescript
function doWatch(
  source: WatchSource | WatchSource[] | WatchEffect | object,
  cb: WatchCallback | null,
  { immediate, deep, flush, onTrack, onTrigger }: WatchOptions = EMPTY_OBJ
): WatchStopHandle {
  ...
}
```

### 某些配置需要回调

```typescript
if (__DEV__ && !cb) {
  if (immediate !== undefined) { ... }
  if (deep !== undefined) { ... }
}
```

生产环境下，如果没有回调，但是填入了 `immediate` 或 `deep` 选项，会警告用户

### 初始化变量

- 源数据错误的提示方法

  ```typescript
  const warnInvalidSource = (s: unknown) => { ... };
  ```

- 当前的组件实例

  ```typescript
  const instance = currentInstance;
  ```

- `getter` 和一些 Flag

  ```typescript
  let getter: () => any;
  let forceTrigger = false;
  let isMultiSource = false;
  ```

  `getter` 函数通过我们传入的 `source` 源数据来实现，用于构建副作用

  `forceTrigger` 标记是否需要强制触发其副作用

  `isMultiSource` 标记是否为多个源数据（数组）

### 构建 getter

- 如果 `source` 为 `ref`

  ```typescript
  if (isRef(source)) {
    getter = () => source.value;
    forceTrigger = isShallow(source);
  }
  ```

  `getter` 直接返回 `ref.value`，也就是监听 `value` 的变化

  如果为 `shallowRef`，为了兼顾 `triggerRef` 接口，需要强制触发其副作用（非常迷幻的特性）

- 如果是响应式的对象

  ```typescript
  else if (isReactive(source)) {
    getter = () => source;
    deep = true;
  }
  ```

  `getter` 直接返回其本身，并且 `deep` 强制为 `true`

- 如果是数组（多个源数据）

  ```typescript
  else if (isArray(source)) {
    isMultiSource = true;
    forceTrigger = source.some((s) => isReactive(s) || isShallow(s));
    getter = () =>
      source.map((s) => {
        if (isRef(s)) {
          return s.value;
        } else if (isReactive(s)) {
          return traverse(s);
        } else if (isFunction(s)) {
          return callWithErrorHandling(s, instance, ErrorCodes.WATCH_GETTER);
        } else {
          __DEV__ && warnInvalidSource(s);
        }
      });
  }
  ```

  `isMultiSource` 设为 `true`

  并且只要里面有任意 `reactive`,`shallow` 的项，则需要强制触发副作用

  `getter` :

  - 如果是 `ref`，返回 `ref.value`，跟上面单个数据源的处理一致

  - 如果是响应式的对象即 `reactive` 处理过的，则 `getter` 会手动遍历其所有属性，遍历是为了 `track` 每一个属性，起到**深度监听**的效果

    如果 `deep` 为 `true`（上面那种情况），后续也会这样处理

  - 如果是函数，则直接调用它

  - 其它情况都是不合法的数据源，直接报错

- 如果是函数（`getter` 函数）

  分为**有回调** `cb`，和**无回调**的情况

  ```typescript
  else if (isFunction(source)) {
    if (cb) { ... }
    else { ... }
  }
  ```

  - 有回调

    对应的是调用 `watch` 的情况

    ```typescript
    getter = () =>
      callWithErrorHandling(source, instance, ErrorCodes.WATCH_GETTER);
    ```

    `getter` 直接返回 `source` 执行的结果

  - 没有回调

    对应调用 `watchEffect` 的情况

    ```typescript
    getter = () => {
      if (instance && instance.isUnmounted) {
        return;
      }
      if (cleanup) {
        cleanup();
      }
      return callWithAsyncErrorHandling(
        source,
        instance,
        ErrorCodes.WATCH_CALLBACK,
        [onCleanup]
      );
    };
    ```

    直接就是一个普通的副作用实现

    `cleanup` 是用户传入的一个钩子函数

    这里可能会觉得奇怪，为什么 `watch` 不用执行 `cleanup`，其实**后面的实现中会补上**

- 啥也不是

  那就啥也不是，直接设置 `getter` 为一个空函数

  ```typescript
  getter = NOOP;
  ```

  `NOOP` 的实现 : `() => {}`

后面会出现处理 vue2 兼容的处理和 SSR 的处理，我们直接无视

### deep 实现

很简单，暴力遍历一遍所有属性来 `track` 其变化

```typescript
if (cb && deep) {
  const baseGetter = getter;
  getter = () => traverse(baseGetter());
}
```

### cleanup

该钩子会在清理副作用时调用

```typescript
let cleanup: () => void;
let onCleanup: OnCleanup = (fn: () => void) => {
  cleanup = effect.onStop = () => {
    callWithErrorHandling(fn, instance, ErrorCodes.WATCH_CLEANUP);
  };
};
```

用户通过暴露出去（后续会暴露）的 `onCleanup` 方法，传一个函数，该函数会被赋值到 `cleanup` 和副作用的 `onStop` 钩子上

### 初始化 oldValue

```typescript
let oldValue = isMultiSource ? [] : INITIAL_WATCHER_VALUE;
```

如果为多数据源，则为一个数组，否则为一个全局固定的对象

### 调度任务

```typescript
const job: SchedulerJob = () => { ... }
```

这玩意主要实现 `flush` 的功能，即调用时机，会涉及到 vue3 渲染时的**三个队列**

- 如果当前副作用已经被停止，不执行

  ```typescript
  if (!effect.active) {
    return;
  }
  ```

- 有回调

  ```typescript
  if (cb) { ... }
  ```

  即 `watch` 的情况

  - 如果有变化、`deep` 或 `forceTrigger` 为 `true`

    ```typescript
    if (
      deep ||
      forceTrigger ||
      (isMultiSource
        ? (newValue as any[]).some((v, i) =>
            hasChanged(v, (oldValue as any[])[i])
          )
        : hasChanged(newValue, oldValue)) ||
      (__COMPAT__ &&
        isArray(newValue) &&
        isCompatEnabled(DeprecationTypes.WATCH_ARRAY, instance))
    ) { ... }
    ```

    先调用 `cleanup` 钩子

    ```typescript
    if (cleanup) {
      cleanup();
    }
    ```

    接着调用回调，回调第三个参数暴露了 [`onCleanup`](#cleanup) 方法

    ```typescript
    callWithAsyncErrorHandling(cb, instance, ErrorCodes.WATCH_CALLBACK, [
      newValue,
      // pass undefined as the old value when it's changed for the first time
      oldValue === INITIAL_WATCHER_VALUE ? undefined : oldValue,
      onCleanup,
    ]);
    ```

    最后更新 `oldValue`，供下次使用

    ```typescript
    oldValue = newValue;
    ```

  - 否则啥也不干

- 如果没有回调

  就是 `watchEffect` 的情况，直接调用副作用即可

  ```typescript
  else {
    // watchEffect
    effect.run();
  }
  ```

最后如果有回调，则该任务是允许递归调用的（回调中触发自身 `trigger`）

```typescript
job.allowRecurse = !!cb;
```

### 调度任务分配队列

```typescript
let scheduler: EffectScheduler;
if (flush === 'sync') {
  scheduler = job as any; // the scheduler function gets called directly
} else if (flush === 'post') {
  scheduler = () => queuePostRenderEffect(job, instance && instance.suspense);
} else {
  // default: 'pre'
  scheduler = () => queuePreFlushCb(job);
}
```

- 如果为 `sync` 同步调用

  直接使用 `job` 本身即可

- `post`

  将该任务推送到组件渲染后执行的队列中延迟执行

- `pre`

  将该任务推送到组件渲染前执行的队列中延迟执行

这里面的实现我抽取一段来说：

- vue3 渲染时有三个队列，除了刚刚 `pre` 和 `post` 之外，还有个中间队列

  `preQueue`, `queue`, `postQueue`

  组件渲染都是在 `queue` 中进行的

- 为了实现 `watch`,`watchEffect` 合并多个更新的特性

  这边使用了[事件循环](../../../basic/javascript/event-loop/)的特性来实现，我们如果深入的去看队列的实现会发现 :

  ```typescript
  function queueFlush() {
    if (!isFlushing && !isFlushPending) {
      isFlushPending = true;
      currentFlushPromise = resolvedPromise.then(flushJobs);
    }
  }
  ```

  这里 `resolvedPromise` 就是 `Promise.resolve()`，利用这里执行 `flushJobs` 函数，将所有队列推入到**微任务**队列中

  我们代码中连续的 `xxxx.a = 1` 之类的修改操作（即**宏任务**）执行完后，会一次性**执行所有微任务**（这里是执行 `flushJobs` 函数，里面会按照三个队列的顺序依次执行） :

  ```typescript
  function flushJobs(seen?: CountMap) {
    ...
    // 执行 pre 队列中的任务
    flushPreFlushCbs(seen);
    ...
    try {
      // 执行中间队列里的任务
      for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
        const job = queue[flushIndex];
        if (job && job.active !== false) {
          if (__DEV__ && check(job)) {
            continue;
          }
          // console.log(`running:`, job.id)
          callWithErrorHandling(job, null, ErrorCodes.SCHEDULER);
        }
      }
    } finally {
      ...
      // 执行 post 队列中的任务
      flushPostFlushCbs(seen);
      ...
    }
  }
  ```

### 构建副作用

```typescript
const effect = new ReactiveEffect(getter, scheduler);
```

利用上面处理好的 [`getter`](#构建-getter) 和 [`scheduler`](#调度任务分配队列)

### 初始化副作用依赖

```typescript
// initial run
if (cb) {
  if (immediate) {
    job();
  } else {
    oldValue = effect.run();
  }
} else if (flush === 'post') {
  queuePostRenderEffect(effect.run.bind(effect), instance && instance.suspense);
} else {
  effect.run();
}
```

看过前面 [`effect`](../effect) 实现的都知道，必须调用 `effect.run` 触发 `track` 才会响应变化

这里不过是针对不同情况用不同的方法去调用

- 如果有回调且需要立刻执行，就直接执行任务 `job`（里面有调用 `effect.run`）

- 有回调但是不用立刻执行，则只追踪变化顺带计算 `oldValue` 初始值

- 没有回调且时机为 `post`，则将副作用推入 `queuePost` 队列，触发更新时，组件渲染结束后才延迟调用副作用

- 没有回调且时机为 `pre`,`sync`，直接调用副作用追踪变化

### 停止监听方法

最后会返回一个停止监听的方法

```typescript
return () => {
  effect.stop();
  if (instance && instance.scope) {
    remove(instance.scope.effects!, effect);
  }
};
```

- 停止副作用

- 如果当前组件实例有 `scope` 作用域，把当前副作用从作用域中移除

## 调用流程

比如下面代码，我们从 `watch` 开始走一遍流程

```typescript
const target = ref(1);
watch(target, (nv, ov) => console.log(nv, ov));
const add = () => target.value++;
Promise.resolve().then(add);
```

- 传入 `ref`，所以 `watch` 执行后会立刻调用一次 `effect.run`，追踪`target.value` 的变化

- 执行 `add` 方法，`target.value` 值变动，调用了 `trigger`，该 `trigger` 会调用 `watch` 内部的 `effect.scheduler` 调度器

- 该调度器将任务（上面提到的[`调度任务`](#调度任务)）推入 `preQueue`，并设置一个微任务，该微任务会按顺序执行**所有队列中的任务**

- 到此宏任务执行完了，开始执行微任务，微任务会先取 `preQueue` 队列中的任务执行，取到了我们的 `job`

- 在 `job` 中通过 `effect.run` 计算出新值，并调用 `watch` 传入的回调
