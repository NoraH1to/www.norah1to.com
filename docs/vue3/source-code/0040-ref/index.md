---
title: ref
date: 2022-07-20 11:19:00
authors: NoraH1to
tags:
  - Vue
  - Vue3
  - 响应式系统
---

## ref

个人感觉 `ref` 设计的有些一言难尽，我个人是能用 `reactive` 的地方绝不用 `ref`，使用心智负担有点高...

我们看下 `ref` 的实现：

```typescript
export function ref(value?: unknown) {
  return createRef(value, false);
}
```

发现调用了 `createRef` 这个工厂方法：

```typescript
function createRef(rawValue: unknown, shallow: boolean) {
  if (isRef(rawValue)) {
    return rawValue;
  }
  return new RefImpl(rawValue, shallow);
}
```

该方法先判断对象是否已经是 `ref`，是则直接返回其本身，否则返回一个 `RefImpl` 的实例

## RefImpl

该类是 `ref` 的具体实现

### 成员变量

```typescript
class RefImpl<T> {
  private _value: T;
  private _rawValue: T;

  public dep?: Dep = undefined;
  public readonly __v_isRef = true;
  ...
}
```

- `_value`：在构造时传入的原始对象被处理后的对象

- `_rawValue`：构造时传入的原始对象

- `dep`：依赖该 `ref` 上 `value` 的副作用集合

- `__v_isRef`：`ref` 类型的标记

### constructor

```typescript
class RefImpl<T> {
  ...
  constructor(value: T, public readonly __v_isShallow: boolean) {
    this._rawValue = __v_isShallow ? value : toRaw(value);
    this._value = __v_isShallow ? value : toReactive(value);
  }
  ...
}
```

若为浅响应，则给 `_rawValue` 直接赋予外部传入的值，否则确保它是一个**原始对象**

若为浅响应，则给 `_value` 直接赋予外部传入的值，否则将其变成一个**响应式对象**

这里如果传入的是一个**普通类型的值**，那么这两个成员变量都是值本身

### value

- getter：

  拦截了读取 `value` 的行为

  ```typescript
  class RefImpl<T> {
    ...
    get value() {
      trackRefValue(this);
      return this._value;
    }
    ...
  }
  ```

  调用 [`trackRefValue`](#trackrefvalue) 追踪当前值的变化，接着返回 `_value`

- setter：

  拦截了修改 `value` 的行为

  ```typescript
  class RefImpl<T> {
    ...
    set value(newVal) {
      newVal = this.__v_isShallow ? newVal : toRaw(newVal);
      if (hasChanged(newVal, this._rawValue)) {
        this._rawValue = newVal;
        this._value = this.__v_isShallow ? newVal : toReactive(newVal);
        triggerRefValue(this, newVal);
      }
    }
    ...
  }
  ```

  如果为浅响应，则直接使用新值，否则确保其是一个原始对象

  如果新值和旧值不同，则更新值，与构造器行为一致，并且调用 [`triggerRefValue`](#triggerrefvalue) 触发值的更新操作

## trackRefValue

用于追踪 `ref` 上 `value` 的变化

该函数接收一个参数 `ref`，即 `RefImpl` 的实例：

```typescript
export function trackRefValue(ref: RefBase<any>) {
  ...
}
```

- 跟[effect 中的 track](../effect#track)行为一致，需要正在执行副作用且能够追踪：

  ```typescript
  if (shouldTrack && activeEffect) {
    ...
  }
  ```

- 确保为原始对象：

  ```typescript
  ref = toRaw(ref);
  ```

  因为可能被 `readonly`,`reactive` 或其它方法处理过

- 调用 [`trackEffects`](../effect#trackeffects)：

  ```typescript
  if (__DEV__) {
    trackEffects(ref.dep || (ref.dep = createDep()), {
      target: ref,
      type: TrackOpTypes.GET,
      key: 'value',
    });
  } else {
    trackEffects(ref.dep || (ref.dep = createDep()));
  }
  ```

  开发环境下还会额外传 debug 信息，没有影响

## triggerRefValue

用于触发追踪 `ref` 上 `value` 变化的副作用

该函数接收两个参数，`ref` 和 `newVal`，分别为 `RefImpl` 的实例和新的值：

```typescript
export function triggerRefValue(ref: RefBase<any>, newVal?: any) {
  ...
}
```

- 跟上面一样确保为原始对象：

  ```typescript
  ref = toRaw(ref);
  ```

- 调用 [`triggerEffects`](../effect/#triggereffects)：

  ```typescript
  if (__DEV__) {
    triggerEffects(ref.dep, {
      target: ref,
      type: TriggerOpTypes.SET,
      key: 'value',
      newValue: newVal,
    });
  } else {
    triggerEffects(ref.dep);
  }
  ```

  开发环境下还会额外传 debug 信息，没有影响

## customRef

该函数提供了自定义 `ref` 的能力，如何使用请查阅[文档](https://v3.cn.vuejs.org/api/refs-api.html#customref)

它返回的是一个 `CustomRefImpl` 的实例：

```typescript
export function customRef<T>(factory: CustomRefFactory<T>): Ref<T> {
  return new CustomRefImpl(factory) as any;
}
```

## CustomRefImpl

该类是 `customRef` 的具体实现

### 成员变量

```typescript
class CustomRefImpl<T> {
  public dep?: Dep = undefined;

  private readonly _get: ReturnType<CustomRefFactory<T>>['get'];
  private readonly _set: ReturnType<CustomRefFactory<T>>['set'];

  public readonly __v_isRef = true;
}
```

- `dep`：依赖该 ref 上 value 的副作用集合

- `_get`：拦截读取 `value` 行为的函数

- `_set`：拦截修改 `value` 行为的函数

- `__v_isRef`：ref 类型的标记

### constructor

构造函数接收一个工厂函数 `factory`

```typescript
class CustomRefImpl<T> {
  ...
  constructor(factory: CustomRefFactory<T>) {
    const { get, set } = factory(
      () => trackRefValue(this),
      () => triggerRefValue(this)
    );
    this._get = get;
    this._set = set;
  }
  ...
}
```

该工厂函数接收**两个**参数，分别是 `track` 方法和 `trigger` 方法，提供给用户编写**追踪、触发响应的逻辑**，能够**自定义调用的时机**

工厂函数需要返回 `get`,`set` 方法，这两个方法会分别赋给 `_get`,`_set`，用户可以在里面编写**读取、修改 `value` 的逻辑**

## toRef

用于将某个对象上的某个键值转为 `Ref`

但是这边有点特殊，它内部的实现并不是跟 `RefImpl`，而是一个模拟 `Ref` 行为的 [`ObjectRefImpl`](#objectrefimpl)

```typescript
export function toRef<T extends object, K extends keyof T>(
  object: T,
  key: K,
  defaultValue?: T[K]
): ToRef<T[K]> {
  const val = object[key];
  return isRef(val)
    ? val
    : (new ObjectRefImpl(object, key, defaultValue) as any);
}
```

如果键值已经是 `ref`，则直接返回，否则用 [`ObjectRefImpl`](#objectrefimpl) 构建

## ObjectRefImpl

构造器的传参与 [`toRef`](#toref) 完全一致

直接看下 `getter` 和 `setter`

- `getter`

  ```typescript
  class ObjectRefImpl<T extends object, K extends keyof T> {
    ...
    get value() {
      const val = this._object[this._key];
      return val === undefined ? (this._defaultValue as T[K]) : val;
    }
    ...
  }
  ```

  直接去取目标对象上对应的键值并返回，如果未定义则返回配置的默认值

- `setter`

  ```typescript
  class ObjectRefImpl<T extends object, K extends keyof T> {
    ...
    set value(newVal) {
      this._object[this._key] = newVal;
    }
  }
  ```

  直接修改目标对象上对应的键值

可以看到整个过程内部都没有存储 `value` 本身，所以只是模拟了 `Ref` 的行为罢了

因此如果 `toRef` 处理的不是一个 `reactive` 的对象，返回的 `Ref` 并不会是响应式的

```typescript
const obj = { count: 0 };
const r = toRef(obj, 'count');
// 副作用应该执行两次，这里只会执行默认的一次
effect(() => console.log(r.value));
r.value++;
```

## proxyRefs

我们在编写 `SFC` 组件时，[文档](https://v3.cn.vuejs.org/guide/composition-api-setup.html#%E7%BB%93%E5%90%88%E6%A8%A1%E6%9D%BF%E4%BD%BF%E7%94%A8)中有提到：

> 注意，从 `setup` 返回的 **refs** 在模板中访问时是被自动浅解包的，因此不应在模板中使用 `.value`。

该特性就是用这个方法实现的，具体在 `packages/runtime-core/src/component.ts` 中被调用，在调用完 `setup` 函数获得 `setupResult` 后，会将 `proxyRefs(setupResult)` 处理后再返回

来看下实现：

```typescript
export function proxyRefs<T extends object>(
  objectWithRefs: T
): ShallowUnwrapRef<T> {
  return isReactive(objectWithRefs)
    ? objectWithRefs
    : new Proxy(objectWithRefs, shallowUnwrapHandlers);
}
```

如果目标对象是响应式的，那么不需要处理直接返回，如果不是的话，就返回一个 `Proxy`，`shallowUnwrapHandlers` 监听器中实现了解包的逻辑：

```typescript
const shallowUnwrapHandlers: ProxyHandler<any> = {
  get: (target, key, receiver) => unref(Reflect.get(target, key, receiver)),
  set: (target, key, value, receiver) => {
    const oldValue = target[key];
    if (isRef(oldValue) && !isRef(value)) {
      oldValue.value = value;
      return true;
    } else {
      return Reflect.set(target, key, value, receiver);
    }
  },
};
```

- `get`：

  可以看到返回了一个经过 `unref` 处理的值，这就是解包

- `set`：

  如果**旧值为 `ref`** 且**新值不为 `ref`**，将新制赋给旧值的 `value`

  其它情况直接赋值就行

> PS：一会解包一会不解包其实挺烦的
>
> 前面 `reactive` 和 `ref` 套娃的时候也是一样，只解包对象中的 `ref` 但不解包数组中的，就离谱...
>
> 心智负担就体现在这了

## 其它 api

没啥好说的，如果从前面的文章看到这还读不懂剩下的接口，**我真的会很无语**
