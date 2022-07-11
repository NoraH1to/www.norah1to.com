---
title: proxy-handlers
date: 2022-07-04 17:54:00
authors: NoraH1to
tags:
  - Vue
  - Vue3
  - 响应式系统
---

在上一节 `reactive` 的源码中，我们发现其向 `createReactiveObject` 函数传入了两个 `handler`：

```typescript
return createReactiveObject(
  target,
  false,
  mutableHandlers,
  mutableCollectionHandlers,
  reactiveMap
);
```

这两个 `handler` 都是 `ProxyHandler` 类型，会根据上一节解释过的 `TargetType` 传给 `Proxy` 构造函数作为第三个实参：

```typescript
const proxy = new Proxy(
  target,
  targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
);
```

`mutableHandlers` 和 `mutableCollectionHandlers` 分别为 `baseHandlers.ts`,`collectionHandlers.ts` 暴露的主要监听器
