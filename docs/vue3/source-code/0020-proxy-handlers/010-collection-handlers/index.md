---
title: collectionHandlers
date: 2022-07-13 14:21:00
authors: NoraH1to
tags:
  - Vue
  - Vue3
  - 响应式系统
---

该文件中的 `handler` 用于处理 `Map`, `Set`, `WeakMap`, `WeakSet` 这类 `ES6` 数据结构的代理对象

这类数据对象都是通过自身的方法来操作数据，所以代理对象只需要在 `get` 监听器中分发需要处理的方法即可

## mutableCollectionHandlers

上一节 [`reactive`](../../reactive#reactive) 接口的传参之一，我们直接跳到其源码处来解读：

```typescript
export const mutableCollectionHandlers: ProxyHandler<CollectionTypes> = {
  get: /*#__PURE__*/ createInstrumentationGetter(false, false),
};
```

正如上面说的，只监听了 `get` 行为

`createInstrumentationGetter` 是一个工厂方法，用于构建需要代理的方法

## createInstrumentationGetter

该方法接收两个参数 `isReadonly`, `shallow` 分别表示是否只读和是否浅层响应：

```typescript
function createInstrumentationGetter(isReadonly: boolean, shallow: boolean) {
  ...
}
```

我们来看里面的实现：

- 首先根据传参决定用哪种方法代理的实现：

  ```typescript
  const instrumentations = shallow
    ? isReadonly
      ? shallowReadonlyInstrumentations
      : shallowInstrumentations
    : isReadonly
    ? readonlyInstrumentations
    : mutableInstrumentations;
  ```

  都为 `false` 时会取到 [`mutableInstrumentations`](#mutableInstrumentations)

- 接着返回 `get` 方法：

  ```typescript
  return (
    target: CollectionTypes,
    key: string | symbol,
    receiver: CollectionTypes
  ) => {
    ...
  };
  ```

再看看该方法的实现：

- 首先处理取各种 flag 的情况：

  ```typescript
  if (key === ReactiveFlags.IS_REACTIVE) {
    return !isReadonly;
  } else if (key === ReactiveFlags.IS_READONLY) {
    return isReadonly;
  } else if (key === ReactiveFlags.RAW) {
    return target;
  }
  ```

  没啥好说的，跟 [`baseHandlers`](../base-handlers/#get) 里逻辑一致

  这里我貌似发现了个问题，开了个[issue](https://github.com/vuejs/core/issues/6268)

- 然后判断是否需要代理其属性，返回

  ```typescript
  return Reflect.get(
    hasOwn(instrumentations, key) && key in target ? instrumentations : target,
    key,
    receiver
  );
  ```

## createInstrumentations

重点来了家人们

该方法构建了各种情况下的代理方法

具体有这些：

```typescript
const [
  mutableInstrumentations,
  readonlyInstrumentations,
  shallowInstrumentations,
  shallowReadonlyInstrumentations,
] = /* #__PURE__*/ createInstrumentations();
```

## mutableInstrumentations

直接看最核心的 `mutableInstrumentations`：

```typescript
const mutableInstrumentations: Record<string, Function> = {
  get(this: MapTypes, key: unknown) {
    return get(this, key);
  },
  get size() {
    return size(this as unknown as IterableCollections);
  },
  has,
  add,
  set,
  delete: deleteEntry,
  clear,
  forEach: createForEach(false, false),
};
```

代理了一大堆方法，来一个个看

### get

很多人可能会问，下面这个 `this` 哪来的：

```typescript
get(this: MapTypes, key: unknown) {
  return get(this, key);
}
```

其实这是一个 typescript 的特性，函数第一个参数名为 `this` 的类型定义，用来定义当前函数执行上下文中 `this` 的类型，并不是一个外部的参数

`vue` 中挺多地方使用了 `this` 但没有检查，所以我们使用 collection 类型的响应式对象时，切记不要使用解构或者下面的代码：

```typescript
const map = reactive(new Map());
const get = map.get;
get(1); // 会报错
```

下面来看返回的 `get` 方法的实现，方法接收**四个**参数：

```typescript
function get(
  target: MapTypes,
  key: unknown,
  isReadonly = false,
  isShallow = false
) {
  ...
}
```

这里要注意 `target` 指的**是响应式对象**，而**不是原始对象**，因为外面传的是 `this`

接着来看实现：

- 获得一些原始的值：

  ```typescript
  target = (target as any)[ReactiveFlags.RAW];
  const rawTarget = toRaw(target);
  const rawKey = toRaw(key);
  ```

  这边把 `target` 设为了其原始对象

  然后又获得了其最深层的原始对象（用于处理 `readonly`, `reactive` 套娃的情况）

  最后获得了其 `key` 的原始值（因为 `Map`,`SeT` 可以在 `key` 上放引用类型，可能也是响应式的）

- 追踪响应式变化：

  ```typescript
  if (!isReadonly) {
    if (key !== rawKey) {
      track(rawTarget, TrackOpTypes.GET, key);
    }
    track(rawTarget, TrackOpTypes.GET, rawKey);
  }
  ```

  如果只读就不用追踪

  如果 `key` 不等于 `rawKey`，说明 `key` 为响应式的，所以要追踪 `key` 的变化

  最后追踪 `rawKey` 本身的变化

- 把取到的值也加进响应式系统中：

  ```typescript
  const { has } = getProto(rawTarget);
  const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
  if (has.call(rawTarget, key)) {
    return wrap(target.get(key));
  } else if (has.call(rawTarget, rawKey)) {
    return wrap(target.get(rawKey));
  } else if (target !== rawTarget) {
    // #3602 readonly(reactive(Map))
    // ensure that the nested reactive `Map` can do tracking for itself
    target.get(key);
  }
  ```

  首先选好处理值的处理器 `wrap`：

  ```typescript
  const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
  ```

  然后判断在原始对象上是否有该 `key` 或者 `rawKey`，有的话就在 `target` 上调用 `get`：

  ```typescript
  if (has.call(rawTarget, key)) {
    return wrap(target.get(key));
  } else if (has.call(rawTarget, rawKey)) {
    return wrap(target.get(rawKey));
  }
  ```

  为什么是 `target.get` 而不是 `rawTarget.get` 呢？

  因为如果是 `readonly(reactive())` 套娃的情况，调用 `rawTarget.get` 并不能经过里面那一层 `get` 的代理，也就是说**不会执行 `track` 追踪**，它会失去响应性

  那最后为啥还要处理套娃的情况？：

  ```typescript
  else if (target !== rawTarget) {
    // #3602 readonly(reactive(Map))
    // ensure that the nested reactive `Map` can do tracking for itself
    target.get(key);
  }
  ```

  为什么要通过 `target.get` 手动追踪一下该 `key` 上值的变动？上面不是已经有处理了吗！

  那是因为前面都是在**有值**的前提下处理的：`if(has.call(rawRTarget, key))`，如果**没有值**呢？例如下面的代码：

  ```typescript
  const map = reactive(new Map()); // 为空
  const readonlyMap = readonly(map);

  effect(() => readonlyMap.get(1)); // 该副作用应当在 1 上的值变动时调用

  map.set(1, 1); // 如果上面的代码去掉，这里 get 后副作用并不会执行
  ```

  这里我也是去掉部分代码后跑测试发现的，测试用例作用不仅是测试，更是方便大家学习的好东西（当然不明所以的用例可能会起到误导作用，这点 vue 做的很好）

### size

这边代理了 `size` 的 `getter`：

```typescript
get size() {
  return size(this as unknown as IterableCollections);
}
```

看下返回的 `size` 方法的实现：

```typescript
function size(target: IterableCollections, isReadonly = false) {
  target = (target as any)[ReactiveFlags.RAW];
  !isReadonly && track(toRaw(target), TrackOpTypes.ITERATE, ITERATE_KEY);
  return Reflect.get(target, 'size', target);
}
```

逻辑很简单

先获得原始对象，若不是只读则追踪迭代操作，最后返回 `size` 的值

### has

`has` 方法是 `Map` 用来判断是否存在 `key` 或者 `Set` 用来判断是否存在 `value` 的方法，方法接收**两个**参数：

```typescript
function has(
  this: CollectionTypes,
  key: unknown,
  isReadonly = false
): boolean {
  ...
}
```

分别是 `key` 和 `isReadonly`，`this` 前面解释过

来看实现

- 首先获得一些原始对象：

  ```typescript
  const target = (this as any)[ReactiveFlags.RAW];
  const rawTarget = toRaw(target);
  const rawKey = toRaw(key);
  ```

- 追踪响应式变化：

  ```typescript
  if (!isReadonly) {
    if (key !== rawKey) {
      track(rawTarget, TrackOpTypes.HAS, key);
    }
    track(rawTarget, TrackOpTypes.HAS, rawKey);
  }
  ```

  跟前面 `get` 的实现完全一样

- 返回值：

  ```typescript
  return key === rawKey
    ? target.has(key)
    : target.has(key) || target.has(rawKey);
  ```

  判断 `key` 和 `rawKey` 是否相同，**相同**直接返回值，**否则**返回两键查找的或运算结果

  这样做是为了用原始对象的键和其响应式代理对象查找的结果都一致：

  ```typescript
  const map = reactive(new Map());
  const origin = {};
  const reactiveOrigin = reactive(origin);
  map.set(reactiveOrigin, 1);

  map.has(reactiveOrigin); // true
  map.has(origin); // true
  ```

### add

该方法只在 `Set` 上有，用于往集合中增加元素，并且只会在不是只读的响应式对象上存在，所以只接收**一个**参数 `value`：

```typescript
function add(this: SetTypes, value: unknown) {
  ...
}
```

来看实现，非常简单

- 获得原始对象：

  ```typescript
  value = toRaw(value);
  const target = toRaw(this);
  ```

- 判断是否已有该值：

  ```typescript
  const proto = getProto(target);
  const hadKey = proto.has.call(target, value);
  if (!hadKey) {
    target.add(value);
    trigger(target, TriggerOpTypes.ADD, value, value);
  }
  return this;
  ```

  **没有**则添加，并触发 `ADD` 响应式事件

  最后返回 `this` 即代理对象本身

### set

用于设置值，只有 `Map` 上有，并且也是非只读才可用，所以只有**两个**参数 `key`, `value`：

```typescript
function set(this: MapTypes, key: unknown, value: unknown) {
  ...
}
```

来看实现

- 先获得原始对象

  ```typescript
  value = toRaw(value);
  const target = toRaw(this);
  const { has, get } = getProto(target);
  ```

  还有工具方法的获取

- 判断是否已经存在该键

  ```typescript
  let hadKey = has.call(target, key);
  if (!hadKey) {
    key = toRaw(key);
    hadKey = has.call(target, key);
  } else if (__DEV__) {
    checkIdentityKeys(target, has, key);
  }
  ```

  若**第一次判断不存在**，会 `toRaw(key)` 后再查一次，确保可能存在的原始对象和响应式对象都查过

- 设置值并触发响应式事件

  ```typescript
  const oldValue = get.call(target, key);
  target.set(key, value);
  if (!hadKey) {
    trigger(target, TriggerOpTypes.ADD, key, value);
  } else if (hasChanged(value, oldValue)) {
    trigger(target, TriggerOpTypes.SET, key, value, oldValue);
  }
  return this;
  ```

  先设置值

  如果**不存在该键**，则触发 `ADD` 响应式事件

  如果**存在该键**，则触发 `SET` 响应式事件，并且会传递旧值 `oldValue`

  最后返回 `this` 即响应式对象自身

### delete

删除指定的值或键，这边 `delete` 为 `deleteEntry` 函数：

```typescript
delete: deleteEntry
```

`deleteEntry` 只在非只读时使用，所以只有**一个**参数：

```typescript
function deleteEntry(this: CollectionTypes, key: unknown) {
  ...
}
```

来看实现

- 获得原始值：

  ```typescript
  const target = toRaw(this);
  const { has, get } = getProto(target);
  ```

  顺带获得工具方法

- 判断是否有该键：

  ```typescript
  let hadKey = has.call(target, key);
  if (!hadKey) {
    key = toRaw(key);
    hadKey = has.call(target, key);
  } else if (__DEV__) {
    checkIdentityKeys(target, has, key);
  }
  ```

  跟上一小节实现一样

- 删除键值

  ```typescript
  const oldValue = get ? get.call(target, key) : undefined;
  // forward the operation before queueing reactions
  const result = target.delete(key);
  if (hadKey) {
    trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue);
  }
  return result;
  ```

  先删除键值

  **若该键存在**则触发 `DELETE` 响应式操作

  最后返回删除结果

### clear

用于清空所有元素，非只读时能使用，**没有参数**：

```typescript
function clear(this: IterableCollections) {
  ...
}
```

来看实现

- 获得原始对象：

  ```typescript
  const target = toRaw(this);
  const hadItems = target.size !== 0;
  ```

  顺便记录是否有元素存在

- 记录旧对象：

  ```typescript
  const oldTarget = __DEV__
    ? isMap(target)
      ? new Map(target)
      : new Set(target)
    : undefined;
  ```

  这些代码纯粹为了开发环境调试服务

- 最后执行清理方法：

  ```typescript
  // forward the operation before queueing reactions
  const result = target.clear();
  if (hadItems) {
    trigger(target, TriggerOpTypes.CLEAR, undefined, undefined, oldTarget);
  }
  return result;
  ```

  先执行清理

  然后判断原本是否有元素，如果有则触发 `CLEAR` 响应式操作

  最后返回清理结果

### forEach

遍历元素的方法，这种读操作的方法基本跟 [`get`](#get) 逻辑差不多，由 `createForEach` 工厂方法构建：

```typescript
forEach: createForEach(false, false);
```

`createForEach` 接收**两个参数**，分别是 `isReadonly`, `isShallow`：

```typescript
function createForEach(isReadonly: boolean, isShallow: boolean) {
  ...
}
```

其内部返回了一个 `forEach` 函数，接收**两个参数**，`callback` 和 `thisArg`：

```typescript
function forEach(
  this: IterableCollections,
  callback: Function,
  thisArg?: unknown
) {
  ...
}
```

来看实现：

- 获得一些原始对象：

  ```typescript
  const observed = this as any;
  const target = observed[ReactiveFlags.RAW];
  const rawTarget = toRaw(target);
  ```

  同时记录了当前代理对象为 `observed`

- 选好处理值的处理器 `wrap`：

  ```typescript
  const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
  ```

- 如果不是只读，则追踪迭代操作

  ```typescript
  !isReadonly && track(rawTarget, TrackOpTypes.ITERATE, ITERATE_KEY);
  ```

- 最后调用 `forEach`

  ```typescript
  return target.forEach((value: unknown, key: unknown) => {
    // important: make sure the callback is
    // 1. invoked with the reactive map as `this` and 3rd arg
    // 2. the value received should be a corresponding reactive/readonly.
    return callback.call(thisArg, wrap(value), wrap(key), observed);
  });
  ```

  维持 `forEach` 原来的行为即可，要把 `value` 和 `key` 经过响应式系统处理
