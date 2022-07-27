---
title: computed
date: 2022-07-25 15:42:00
authors: NoraH1to
tags:
  - Vue
  - Vue3
  - 响应式系统
---

计算属性大家肯定都很熟悉了

其内部实现依赖 `effect`，追踪到变化后重新计算结果，并且返回的是一个类似 `ref` 的玩意

其源码在 `packages/reactivity/src/computed.ts`

## computed

我们直接定位到方法，可以看到有很几种声明：

```typescript
// 只传 getter
export function computed<T>(
  getter: ComputedGetter<T>,
  debugOptions?: DebuggerOptions
): ComputedRef<T>
// 传一个对象，里面放有 getter 和 setter
export function computed<T>(
  options: WritableComputedOptions<T>,
  debugOptions?: DebuggerOptions
): WritableComputedRef<T>
// 实现
export function computed<T>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>,
  debugOptions?: DebuggerOptions,
  isSSR = false
) {
  ...
}
```

其分别代表了只传 `getter` 和 `getter`,`setter` 都传的情况

来看实现：

- 定义一些变量：

  ```typescript
  let getter: ComputedGetter<T>;
  let setter: ComputedSetter<T>;
  ```

- 分别处理只传了 `getter` 和都传的情况：

  ```typescript
  const onlyGetter = isFunction(getterOrOptions);
  if (onlyGetter) {
    getter = getterOrOptions;
    setter = __DEV__
      ? () => {
          console.warn('Write operation failed: computed value is readonly');
        }
      : NOOP;
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }
  ```

  给 `getter` 和 `setter` 赋值

- 构建一个 [`ComputedRefImpl`](#computedrefimpl) 的实例并返回：

  ```typescript
  const cRef = new ComputedRefImpl(
    getter,
    setter,
    onlyGetter || !setter,
    isSSR
  );

  if (__DEV__ && debugOptions && !isSSR) {
    cRef.effect.onTrack = debugOptions.onTrack;
    cRef.effect.onTrigger = debugOptions.onTrigger;
  }

  return cRef as any;
  ```

## ComputedRefImpl

是一个类，是计算属性的核心实现

### 成员变量

- `dep` : 依赖当前计算属性的副作用集合

- `_value` : 计算的结果

- `effect` : 用于捕获 `getter` 方法中依赖的响应式值的副作用

- `__v_isRef` : 标识该对象为 `ref`

- `[ReactiveFlags.IS_READONLY]` : 标识该对象是否为只读的

- `_dirty` : 用于标识当前计算结果是否已经不可用（依赖的响应式值变动了，但是还没计算）

- `_cacheable` : 不为 SSR 环境时为 `true`，我们**只讨论非 SSR 的实现**

### 构造器

接收四个参数：

- `getter` : 计算方法

- `_setter` : 赋值方法

- `isReadonly` : 是否只读，[`computed`](#computed) 有 `setter` 的情况下才为 `true`

- `isSSR` : 是否为服务端渲染，只讨论 `false` 的情况

```typescript
export class ComputedRefImpl<T> {
  ...
  constructor(
    getter: ComputedGetter<T>,
    private readonly _setter: ComputedSetter<T>,
    isReadonly: boolean,
    isSSR: boolean
  ) {
    ...
  }
  ...
}
```

来看实现

- 首先将 `getter` 方法作为回调构建一个副作用

  ```typescript
  this.effect = new ReactiveEffect(getter, () => {
    if (!this._dirty) {
      this._dirty = true;
      triggerRefValue(this);
    }
  });
  ```

  同时传入了一个适配器方法，`getter` 中的响应式对象属性变化并调用 `trigger` 时，会优先调用**适配器**（详情[看这](../effect/#triggereffects)）

  适配器逻辑很简单

  - 如果当前计算结果标记为干净的

  - 则将其设为脏

  - 并触发**依赖当前计算结果的副作用**

- 设置各种 Flag

  ```typescript
  this.effect.computed = this;
  this.effect.active = this._cacheable = !isSSR;
  this[ReactiveFlags.IS_READONLY] = isReadonly;
  ```

  标记当前副作用为 `computed` 类型的，作用[看这](../effect/#triggereffects)

  标记当前副作用为活跃的，当前计算属性是可缓存的（只讨论 `isSSR` 为 `false` 的情况）

  设置只读标记

### value

- `getter`

  用于拦截 `value` 属性的读取行为

  ```typescript
  export class ComputedRefImpl<T> {
    ...
    get value() {
      ...
    }
    ...
  }
  ```

  - 可能被其它方法套娃（`readonly`等），首先确保拿到的对象本身

    ```typescript
    // the computed ref may get wrapped by other proxies e.g. readonly() #3376
    const self = toRaw(this);
    ```

  - 追踪各种副作用和依赖

    ```typescript
    trackRefValue(self);
    if (self._dirty || !self._cacheable) {
      self._dirty = false;
      self._value = self.effect.run()!;
    }
    return self._value;
    ```

    先调用 [`trackRefValue`](../ref/#trackrefvalue) 追踪依赖 `value` 的副作用

    接着如果当前值为脏，则调用副作用的 `run` 来重新运行 `getter` 给 `_value` 赋值

    最后返回结果

- `setter`

  就很简单，直接调用当前 `_setter`

  ```typescript
  export class ComputedRefImpl<T> {
    ...
    set value(newValue: T) {
      this._setter(newValue);
    }
  }
  ```

## 计算流程

首先有下面代码：

```typescript
const countA = reactive({ count: 1 });
const countB = reactive({ count: 1 });
const c = computed(() => countA.count + countB.count);

effect(() => console.log(c.value));

countA.count++;
```

前两行不用解释了吧

从第三行开始

- `computed` 接收到 `getter: () => countA.count + countB.count)`，并传给 `ComputedRefImpl.effect` 作为副作用的回调

- `effect` 副作用执行，在执行中取了 `c.value`

- 此时触发了 `c` 中的 `value` 的 `getter` 方法 : `get value()`

- 进入到 `get value()` 方法，首先记录当前 `effect` 依赖 `c.value`

- 接着立刻执行一次 `ComputedRefImpl.effect.run`，`run` 执行的时候会返回 `getter` 的执行结果

- `getter` 执行的时候因为读取了 `countA.count`,`countB.count` 又会被 `countA`,`countB` 两个响应式对象捕获，响应式对象通过 `track` 将 `ComputedRefImpl.effect` 加入依赖树

- 最后返回结果，控制台打印 `2`

- 最后一行调用 `countA.count++`，触发了响应式对象 `countA` 的 `trigger`

- `trigger` 会依次调用依赖其变化的副作用的回调，调用时会优先调用适配器方法；此时会进入到[构造器](#构造器)实现的第一行的第二个回调函数

  ```typescript
  this.effect = new ReactiveEffect(getter, () => {
    if (!this._dirty) {
      this._dirty = true;
      triggerRefValue(this);
    }
  });
  ```

- 里面调用了 [`triggerRefValue`](../ref/#triggerrefvalue) 方法，该方法会触发依赖计算属性值的副作用，也就是 `effect(() => console.log(c.value));` 中的回调

- 此时再次进入 `get value()` 方法，计算出新值并返回
