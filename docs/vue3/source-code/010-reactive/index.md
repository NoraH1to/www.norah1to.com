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

如果 **`RAW` 不为空且是只读或响应式的对象**，直接返回其本身

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

下面这段代码用于判断是**只读或响应式**的对象

```typescript
!(isReadonly && target[ReactiveFlags.IS_REACTIVE]);
```

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

`getTargetType` 函数请查阅本文[其对应小节](#getTargetType)

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

## getTargetType

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

## targetTypeMap

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

vue 中监听这两种对象的实现有所不同，后面再说
