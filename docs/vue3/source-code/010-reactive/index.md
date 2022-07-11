---
title: reactive
date: 2022-07-04 17:54:00
authors: NoraH1to
tags:
  - Vue
  - Vue3
  - 响应式系统
  - reactive
---

首先我们来看 `packages/reactivity/reactive.ts` 是如何创建响应式对象的

## reactive

对外暴露的最常用的接口

```typescript
export function reactive(target: object) {
  // if trying to observe a readonly proxy, return the readonly version.
  if (isReadonly(target)) {
    return target;
  }
  return createReactiveObject(
    target,
    false,
    mutableHandlers,
    mutableCollectionHandlers,
    reactiveMap
  );
}
```

最表层的逻辑很简单，判断是否为只读对象

**是**则返回其本身

**否**则创建一个响应式对象返回

`createReactiveObject` 是创建响应式对象的工厂方法，是该文件的核心

## createReactiveObject

接着再到创建响应式对象这个方法

这边我们拆解下逻辑慢慢看：

### 是否为对象类型

```typescript
if (!isObject(target)) {
  if (__DEV__) {
    console.warn(`value cannot be made reactive: ${String(target)}`);
  }
  return target;
}
```

如果**不是对象类型**则返回对象本身

若在开发模式下，会在控制台打印警告

### 响应式系统处理是否处理过

如果 **`RAW` 不为空且调用方法相同**，直接返回其本身

```typescript
// target is already a Proxy, return it.
// exception: calling readonly() on a reactive object
if (
  target[ReactiveFlags.RAW] &&
  !(isReadonly && target[ReactiveFlags.IS_REACTIVE])
) {
  return target;
}
```

下面这段代码用于判断是**调用方法是否相同**

```typescript
!(isReadonly && target[ReactiveFlags.IS_REACTIVE]);
```

只有 `isReadonly` 和 `target[ReactiveFlags.IS_REACTIVE]` 任意一项或者都为 `false` 时，才返回 `true`

这种情况的代码如下：

```typescript
// isReadonly = false, target[ReactiveFlags.IS_REACTIVE] = true
reactive(reactive({}));
// isReadonly = true, target[ReactiveFlags.IS_REACTIVE] = false
readonly(readonly({}));
// isReadonly = false, target[ReactiveFlags.IS_REACTIVE] = false
reactive(readonly({}));
```

这三种情况都会返回内层函数的值，但是 `readonly(reactive({}))` 却会继续执行，这是为了 [`isReactive`](#isreactive) 中文档提到的特性

### 是否存在其对应的响应式代理对象

如果在 `proxyMap` 中找到了，直接返回找到的代理对象

```typescript
// target already has corresponding Proxy
const existingProxy = proxyMap.get(target);
if (existingProxy) {
  return existingProxy;
}
```

其中，`proxyMap` 是一个 `WeakMap`，其键为**原始对象的地址**，值为对应的**响应式代理对象**

例如我们有下面代码：

```html
<script setup lang="ts">
  import { reactive } from 'vue';

  const originObj = { count: 1 };

  const foo = reactive(originObj);
  const bar = reactive(originObj);
</script>
```

`foo` 和 `bar` 是同一个对象

传入的 `proxyMap` 的作用也就很明显了，用于存储、复用 `reactive` 函数创建的响应式对象

### 判断对象类型

走到这，可以确认对象没有被 vue 处理过

判断下是不是 vue 可以处理的类型，如果不是，则返回原始值（`INVALID` 就是无效的意思）

```typescript
// only specific value types can be observed.
const targetType = getTargetType(target);
if (targetType === TargetType.INVALID) {
  return target;
}
```

`getTargetType` 函数请查阅本文[其对应小节](#gettargettype)

### 创建响应式对象

使用了 `Proxy` 对象来进行监听对象赋值取值行为

接着把代理对象放到 `proxyMap` 中，最后返回

```typescript
const proxy = new Proxy(
  target,
  targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
);
proxyMap.set(target, proxy);
return proxy;
```

## 其它公开的 api

一些对外公开但是实现与 `reactive` 类同或者过于简单的 api

### shallowReactive

也是用 `createReactiveObject` 工厂方法构建的：

```typescript
export function shallowReactive<T extends object>(
  target: T
): ShallowReactive<T> {
  return createReactiveObject(
    target,
    false,
    shallowReactiveHandlers,
    shallowCollectionHandlers,
    shallowReactiveMap
  );
}
```

`Handlers` 传入的有所不同，`proxyMap` 也不同

### readonly

同上：

```typescript
export function readonly<T extends object>(
  target: T
): DeepReadonly<UnwrapNestedRefs<T>> {
  return createReactiveObject(
    target,
    true,
    readonlyHandlers,
    readonlyCollectionHandlers,
    readonlyMap
  );
}
```

构建时 `isReadonly` 传了 `true`

### shallowReadonly

同上：

```typescript
export function shallowReadonly<T extends object>(target: T): Readonly<T> {
  return createReactiveObject(
    target,
    true,
    shallowReadonlyHandlers,
    shallowReadonlyCollectionHandlers,
    shallowReadonlyMap
  );
}
```

### isReactive

用于判断是否为响应式的对象，文档中有提到：

> 如果该代理是 `readonly` 创建的，但包裹了由 `reactive` 创建的另一个代理，它也会返回 `true`。

看看源码：

```typescript
export function isReactive(value: unknown): boolean {
  if (isReadonly(value)) {
    return isReactive((value as Target)[ReactiveFlags.RAW]);
  }
  return !!(value && (value as Target)[ReactiveFlags.IS_REACTIVE]);
}
```

在判断为只读后，会获得其 `RAW` 即原始对象，判断其原始对象是不是响应式的；

例如：

```typescript
const objReact = reactive({ value: 0 });
const objReadonly = readonly(objReact);
isReactive(objReadonly); // true
```

`isReactive` 中获得到的 `RAW` 就是 `objReact`，返回的也自然是 `true` 了

### isReadonly

判断是否只读

```typescript
export function isReadonly(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_READONLY]);
}
```

没啥好说的，判断 `IS_READONLY` 标记位

### isShallow

判断是否浅层响应

实现同上

### isProxy

判断是否为响应式系统中的对象

直接返回 `isReactive` 与 `isReadonly` 的结果的或运算

### toRaw

递归调用获得其原始对象，用于处理例如 [`isReactive`](#isreactive) 中的情况

```typescript
export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as Target)[ReactiveFlags.RAW];
  return raw ? toRaw(raw) : observed;
}
```

获得目标 `RAW` 标记位的值；

如果为空，则返回目标本身；

不为空则使用 `RAW` 的值递归调用

### markRaw

标记一个响应式对象永远返回原始值，并且不再为响应式

```typescript
export function markRaw<T extends object>(
  value: T
): T & { [RawSymbol]?: true } {
  def(value, ReactiveFlags.SKIP, true);
  return value;
}
```

使用工具方法，标记 `SKIP` 为 `true`

## 其它内部方法

简单说下较重要的实现

### getTargetType

用于获取对象的类型

```typescript
function getTargetType(value: Target) {
  return value[ReactiveFlags.SKIP] || !Object.isExtensible(value)
    ? TargetType.INVALID
    : targetTypeMap(toRawType(value));
}
```

如果对象被标记跳过或者不可扩展（被 `Object.freeze` 冻结或者[其它](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/isExtensible)），返回不可用，否则返回 `targetTypeMap` 方法的返回值

`toRawType` 方法简单说下：  
通过 `Object().toString.call(obj)` 获得类似 `"[object Foo]"` 的字符串，然后截取 `"Foo"` 返回

### targetTypeMap

从这个方法可以知道 vue 能转换哪些对象为响应式对象

```typescript
function targetTypeMap(rawType: string) {
  switch (rawType) {
    case 'Object':
    case 'Array':
      return TargetType.COMMON;
    case 'Map':
    case 'Set':
    case 'WeakMap':
    case 'WeakSet':
      return TargetType.COLLECTION;
    default:
      return TargetType.INVALID;
  }
}
```

这些类型分为两大类，`COMMON` 和 `COLLECTION`，**最基础的能直接访问的**数据结构和**需要用迭代器、函数来访问的**数据结构

vue 中监听这两种对象的监听器实现有所不同
