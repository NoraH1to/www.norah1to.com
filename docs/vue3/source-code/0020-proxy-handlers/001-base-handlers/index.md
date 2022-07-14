---
title: baseHandlers
date: 2022-07-04 17:54:00
authors: NoraH1to
tags:
  - Vue
  - Vue3
  - 响应式系统
---

该文件中的 `handler` 用于处理 `Object`, `Array` 的代理对象

## mutableHandlers

是最主要的实现，上一节 [`reactive`](../../reactive#reactive) 接口的传参之一，我们直接跳到其源码处来解读：

```typescript
export const mutableHandlers: ProxyHandler<object> = {
  get,
  set,
  deleteProperty,
  has,
  ownKeys,
};
```

可以看到，`vue3` 的响应式系统监听了

- 赋值

- 取值

- 删除属性

- 判断属性存在

- 获得对象上存在的属性列表

这 5 种行为

## get

跳转倒 `get` 的实现，发现是一个工厂方法返回的函数：

```typescript
const get = /*#__PURE__*/ createGetter();
```

其它的 `Getter` 也都是这个工厂方法构造的：

```typescript
const get = /*#__PURE__*/ createGetter();
const shallowGet = /*#__PURE__*/ createGetter(false, true);
const readonlyGet = /*#__PURE__*/ createGetter(true);
const shallowReadonlyGet = /*#__PURE__*/ createGetter(true, true);
```

再追踪下 `createGetter` 方法的实现：

```typescript
function createGetter(isReadonly = false, shallow = false) {
  ...
}
```

其接收两个参数，表示该响应式对象是否**只读**或是**浅层的响应式**（只有第一层属性是响应式的），默认都是 `false`

方法返回了 `get` 函数，用于监听对象的**取值**行为：

```typescript
return function get(
    target: Target,
    key: string | symbol,
    receiver: object
) {
  ...
};
```

接着来看 `get` 的实现

首先是对 `vue` 内部使用的一些 `flag` 进行特殊处理：

```typescript
if (key === ReactiveFlags.IS_REACTIVE) {
  return !isReadonly;
} else if (key === ReactiveFlags.IS_READONLY) {
  return isReadonly;
} else if (key === ReactiveFlags.IS_SHALLOW) {
  return shallow;
} else if (
  key === ReactiveFlags.RAW &&
  receiver ===
    (isReadonly
      ? shallow
        ? shallowReadonlyMap
        : readonlyMap
      : shallow
      ? shallowReactiveMap
      : reactiveMap
    ).get(target)
) {
  return target;
}
```

`ReactiveFlags.RAW` 这边存的是原始对象，取原始对象的时候通过对应方法的 `Map` 来获得其响应式代理对象（上一节 `reactive` 方法使用的是 `reactiveMap`，`readonly` 使用 `readonlyMap`，其它方法以此类推）

代理对象若存在且与当前代理对象相同，说明该对象已经被 `proxyHandler` 种的方法处理过，直接返回其原对象

然后判断为 `Array` 数组类型的情况：

```typescript
const targetIsArray = isArray(target);

if (!isReadonly && targetIsArray && hasOwn(arrayInstrumentations, key)) {
  return Reflect.get(arrayInstrumentations, key, receiver);
}
```

如果为数组且不为只读，并且读取的是 `vue` 响应式系统需要特殊处理的方法，返回 `vue` 对这些方法的二次封装，详情请看[下一小节](#createarrayinstrumentations)

最后直接取值

```typescript
const res = Reflect.get(target, key, receiver);
```

判断一些特殊情况：

- `key` 为 `Symbol` 类型，并且是 `Symbol` 内置的属性；或为不能追踪的属性，直接返回值

  ```typescript
  if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
    return res;
  }
  ```

- 如果属性不是只读的，追踪该属性变动（响应式，后续在 `effect` 详细说）

  ```typescript
  if (!isReadonly) {
    track(target, TrackOpTypes.GET, key);
  }
  ```

- 如果是浅层响应式，直接返回值

  ```typescript
  if (shallow) {
    return res;
  }
  ```

- 如果是 `ref` 类型的属性，如果不是取数组上的元素，解包返回 `value`，否则返回值

  ```typescript
  if (isRef(res)) {
    // ref unwrapping - skip unwrap for Array + integer key.
    return targetIsArray && isIntegerKey(key) ? res : res.value;
  }
  ```

  > TODO：我个人还没搞懂为什么数组上的 `ref` 元素不解包

  目前代码会是这个效果：

  ```typescript
  import { reactive, ref } from 'vue';

  const arr = reactive([ref({ count: 0 })]);
  // 需要手动在 value 上获取
  console.log(arr[0].value.count); // 0

  const obj = reactive({ count: ref(0) });
  // 自动解包
  console.log(obj.count); // 0
  ```

- 到这里可以断定该属性上的值没有被响应式系统处理过，判断是否为对象，进一步处理

  如果为对象，根据该属性是否只读，让响应式系统处理该值

  ```typescript
  if (isObject(res)) {
    // Convert returned value into a proxy as well. we do the isObject check
    // here to avoid invalid value warning. Also need to lazy access readonly
    // and reactive here to avoid circular dependency.
    return isReadonly ? readonly(res) : reactive(res);
  }
  ```

  从这里可以看出 `vue` 不会一次性把所有值都在响应式系统中处理，嵌套的值只在首次使用后处理，这样性能会很好

- 最后，不为对象直接返回值本身

  ```typescript
  return res;
  ```

## set

`set` 方法同上，也是一个工厂方法返回的函数：

```typescript
const set = /*#__PURE__*/ createSetter();
```

追踪下 `createSetter` 方法的实现：

```typescript
function createSetter(shallow = false) {
  ...
}
```

接收一个参数，判断是否是**浅层的响应式**，默认 `false`

方法返回了 `set` 函数，用于监听对象的**赋值**行为：

```typescript
return function set(
  target: object,
  key: string | symbol,
  value: unknown,
  receiver: object
): boolean {
  ...
}
```

- 首先取到旧值 `oldValue`

  ```typescript
  let oldValue = (target as any)[key];
  ```

- 接着判断旧值为**只读**且**为 `ref`** 时，新值是否**也为 `ref`**

  ```typescript
  if (isReadonly(oldValue) && isRef(oldValue) && !isRef(value)) {
    return false;
  }
  ```

  如果不是，直接返回 `false`，赋值失败

- 处理**不为浅层属性**且**新值不为只读**的情况

  ```typescript
  if (!shallow && !isReadonly(value)) {
    if (!isShallow(value)) {
      value = toRaw(value);
      oldValue = toRaw(oldValue);
    }
    if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
      oldValue.value = value;
      return true;
    }
  } else {
    // in shallow mode, objects are set as-is regardless of reactive or not
  }
  ```

  - 如果同时新值还不为浅层响应式对象，则要考虑为响应式代理对象的情况，需确保值原始对象或者普通的值

  为什么旧值新值都需要 `toRaw` 转换成原始对象呢？

  **因为**

  > 在响应式框架中，原始对象上的属性都应当为原始对象或者普通的值，而不能为代理对象（应该是一种设计约定，不处理理论上不会有什么问题）

  获得响应式对象的属性时，应从其 `get` 监听器中从对应的 `proxyMap` 中获得值，在 `createGetter` 最后的一段代码中就是这样处理的：

  ```typescript
  if (isObject(res)) {
    // Convert returned value into a proxy as well. we do the isObject check
    // here to avoid invalid value warning. Also need to lazy access readonly
    // and reactive here to avoid circular dependency.
    return isReadonly ? readonly(res) : reactive(res);
  }
  ```

  返回的两个方法都会根据原始对象的地址去**获得已有的响应式对象**，**没有则新建**

  **所以**

  为了维护这个设计约定

  旧值 `toRaw` 是为了处理默认值为嵌套响应式对象的情况例如 `const obj = reactive({ value: reactive({ value: 233 }) })`；新值 `toRaw` 为了确保后续不会出现嵌套的情况

  `shallow = true` 时无需确保，因为这时属性上的值不会在 `get` 监听器中被改为响应式对象

  - 如果原始对象不为数组且为 `ref`，并且新值不为 `ref`时

  直接给旧值 `ref` 的 `value` 赋予新值

  TODO：这是铁了心不处理响应式数组为 `ref` 的元素...真的不知道为啥

- 最后判断是更新还是新属性值

  ```typescript
  const hadKey =
    isArray(target) && isIntegerKey(key)
      ? Number(key) < target.length
      : hasOwn(target, key);
  const result = Reflect.set(target, key, value, receiver);
  // don't trigger if target is something up in the prototype chain of original
  if (target === toRaw(receiver)) {
    if (!hadKey) {
      trigger(target, TriggerOpTypes.ADD, key, value);
    } else if (hasChanged(value, oldValue)) {
      trigger(target, TriggerOpTypes.SET, key, value, oldValue);
    }
  }
  return result;
  ```

  给原始对象赋值

  然后这个判断 `target === toRaw(receiver)`，个人推测是单纯的防御性代码，因为理论上不会出现不相等的情况

  接着如果没有值，则触发**增加**操作，有值则触发**赋值**操作

  最后返回赋值结果

## deleteProperty

监听删除属性的行为，类似下面代码就会触发：

```typescript
import { reactive } from 'vue';

const obj = reactive({ value: 0 });
delete obj.value; // 触发
```

删除倒是最简单的，我们直接跳到其实现处：

```typescript
function deleteProperty(target: object, key: string | symbol): boolean {
  const hadKey = hasOwn(target, key);
  const oldValue = (target as any)[key];
  const result = Reflect.deleteProperty(target, key);
  if (result && hadKey) {
    trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue);
  }
  return result;
}
```

直接删除，如果删除成且该原本是存在的，则触发 `DELETE` 的响应式操作，最后返回结果

## has

`has` 用来捕捉 `in` 运算符

只读和浅响应式都无需在使用 `in` 时进行一些操作，所以实现也是相当简单：

```typescript
function has(target: object, key: string | symbol): boolean {
  const result = Reflect.has(target, key);
  if (!isSymbol(key) || !builtInSymbols.has(key)) {
    track(target, TrackOpTypes.HAS, key);
  }
  return result;
}
```

其实就是 `get` 中的一部分操作，取过值后的跟踪变化操作，并且也要注意不能追踪 `Symbol` 和 `Symbol` 上 `Symbol` 类型的属性

## ownKeys

这个方法会捕获获得对象上属性名列表和 `Symbol` 属性列表的方法 `Object.getOwnPropertyNames`,`Object.getOwnPropertySymbols`

并且在使用 `for ... in` 操作符的时候也会捕获到

代码实现如下：

```typescript
function ownKeys(target: object): (string | symbol)[] {
  track(target, TrackOpTypes.ITERATE, isArray(target) ? 'length' : ITERATE_KEY);
  return Reflect.ownKeys(target);
}
```

这边 `ITERATE_KEY` 的作用是标记该追踪为迭代器类型，一般是在代码或者 `SFC` 模板语法中的 `v-for` 写法中用到，又或者是 `computed` 和 `watchEffect` 中进行 `for ... in` 操作时也会用到该标记

在触发 `ADD`,`DELETE`,`SET` 等操作时，都会调用该标记中追踪的内容

至于为什么要特殊处理数组的 `for ... in` 操作去追踪 `length`，是因为在[issue](https://github.com/vuejs/core/issues/2427)中，提到了 `computed` 中进行 `for ... in` 操作空数组会不更新视图，但是我个人点进去 `codepen` 并没复现出来...

## createArrayInstrumentations

该方法代理了部分可能需要触发响应式操作的数组方法

首先声明一个对象用于存储代理方法：

```typescript
const instrumentations: Record<string, Function> = {};
```

### 需监听数组元素变化

然后复写一组需要监听数组元素响应式变化的方法，分别是 `includes`, `indexOf`, `lastIndexOf`：

```typescript
// instrument identity-sensitive Array methods to account for possible reactive
// values
(['includes', 'indexOf', 'lastIndexOf'] as const).forEach((key) => {
  instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
    const arr = toRaw(this) as any;
    for (let i = 0, l = this.length; i < l; i++) {
      track(arr, TrackOpTypes.GET, i + '');
    }
    // we run the method using the original args first (which may be reactive)
    const res = arr[key](...args);
    if (res === -1 || res === false) {
      // if that didn't work, run it again using raw values.
      return arr[key](...args.map(toRaw));
    } else {
      return res;
    }
  };
});
```

来一行行看

- 首先我们需要在原始对象上操作：

  ```typescript
  const arr = toRaw(this) as any;
  ```

  如果我们仍然在 `this` 上操作的话会陷入死循环，大家稍微想下就明白了

- 接着追踪数组上的每一个元素的 `GET` 操作：

  ```typescript
  for (let i = 0, l = this.length; i < l; i++) {
    track(arr, TrackOpTypes.GET, i + '');
  }
  ```

  这里很重要，大家可以去掉该循环，然后跑一下测试用例（`pnpm test`），然后会发现

  在 `reactivity/__tests__/reactiveArray.spec.ts` 下第 `78` 行的测试用例会报错：

  ```typescript
  test('Array identity methods should be reactive', () => {
    const obj = {};
    const arr = reactive([obj, {}]);

    let index: number = -1;
    effect(() => {
      index = arr.indexOf(obj);
    });
    expect(index).toBe(0);
    arr.reverse();
    expect(index).toBe(1);
  });
  ```

  预期行为是 `effect` 先执行一次，在 `reverse` 执行后再执行一次

  若 `indexOf` 没有追踪元素变化，则 `effect` 不会执行，导致最后一句断言抛错

- 接着就是执行方法本身

  ```typescript
  const res = arr[key](...args);
  if (res === -1 || res === false) {
    // if that didn't work, run it again using raw values.
    return arr[key](...args.map(toRaw));
  } else {
    return res;
  }
  ```

  为了确保方法正确判断，这边在执行结果为 `false`, `-1` 时，在确保参数为原始对象后，会再次调用

  例如下面这种情况：

  ```typescript
  const arr = reactive<any[]>([{}, {}]);
  arr.indexOf(arr[0]); // 正常应该返回 0，如果上面的代码没有额外处理，会返回 -1
  ```

  这边因为响应式系统的原因，`arr[0]` 拿到的是一个经过响应式系统处理过的 `Proxy` 对象，那么在原始 `arr` 的原始数组上找肯定找不到，会返回 `-1`，这种行为是错误的

### 会影响数组长度的函数

然后是会影响数组长度（会修改数组本身）的函数，有 `push`, `pop`, `shift`, `unshift`, `splice`：

```typescript
// instrument length-altering mutation methods to avoid length being tracked
// which leads to infinite loops in some cases (#2137)
(['push', 'pop', 'shift', 'unshift', 'splice'] as const).forEach((key) => {
  instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
    pauseTracking();
    const res = (toRaw(this) as any)[key].apply(this, args);
    resetTracking();
    return res;
  };
});
```

这边主要是为了处理死循环的问题，这个[issue](https://github.com/vuejs/core/issues/2137)中说的很清楚，是 `3.0.0-rc.12` 早期版本的问题

复现代码如下：

```typescript
const arr = reactive([]);

watchEffect(() => {
  console.log(1);
  arr.push(1);
});

watchEffect(() => {
  console.log(2);
  arr.push(2);
});
```

控制台会不停的输出 `1` 和 `2`

但是数组 `length` 属性又不能不监听，不监听会丢失很多响应性，所以这边处理方法很粗暴：在这些方法**执行前暂停追踪**，**执行后恢复**...

最后返回代理方法的集合

## 其它 handlers

例如 `readonly`, `shallow`, `shallowReadonly` 等等，无非就是限制一些行为

比如 `readonly` 的 `set`, `deleteProperty` 都改为空的实现，`get` 则只是 `createGetter` 工厂方法的传参不同罢了
