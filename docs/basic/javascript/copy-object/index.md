---
title: 对象拷贝
date: 2022-06-14 15:30:00
authors: NoraH1to
tags:
  - Javascript
---

> 本文参考了：[2.6 万字 JS 干货分享，带你领略前端魅力！- 第二节](https://juejin.cn/post/6844904136161361933#heading-13)

对象拷贝分成**浅拷贝**和**深拷贝**

## 浅拷贝

即只拷贝对象第一层的属性值，如果属性是引用类型，拷贝的是其引用：

```javascript
let origin = { list: [1, 2, 3], foo: 'foo' };
let cp = Object.assign({}, origin);

// 是同一个 Array 对象
origin.list === cp.list; // true
```

### 实现

除了上面的 `Object.assign` 方法，还有许多 API 和方法来实现浅拷贝：

- 遍历实现：

  ```javascript
  let cp = {};
  for (const key in origin) {
    cp[key] = origin[key];
  }
  ```

- ES6 展开运算符：

  ```javascript
  let cp = { ...origin };
  ```

- 迭代器：

  ```javascript
  let cp = Object.fromEntries(Object.entries(origin));
  ```

- 通过 `Object.create` 的第二个参数传入拷贝对象的属性描述列表：

  ```javascript
  let cp = Object.create(
    Object.prototype,
    Object.getOwnPropertyDescriptors(origin)
  );
  ```

- 通过 `Object.defineProperties` 的第二个参数传入拷贝对象的属性描述列表：

  ```javascript
  Object.defineProperties({}, Object.getOwnPropertyDescriptors(origin));
  ```

## 深拷贝

在浅拷贝的基础上，遇到引用类型的值，进行递归处理，有两点需要注意：

- ES6 部分新的内置数据结构对象要特殊处理下，例如 `Set`,`Map`,`Symbol`

- 循环引用也需要用一个 `weakMap` 来存储复用，防止陷入无限递归

### 实现

我推荐用工具库实现的深拷贝，例如 `lodash`,`ramda` 等等

这边也放上一个掘金上找到的不错的实现，其实有很多可以优化的地方，但是我懒得改了，加些注释就算了：

```javascript
// 深拷贝具体版，非完全，但大部分都可以
function deepClonePlus(a, weakMap = new WeakMap()) {
  const type = typeof a;
  // 如果是基础类型或 null，直接返回
  if (a === null || type !== 'object') return a;
  // 如果是循环引用的对象，直接返回
  if ((s = weakMap.get(a))) return s;
  const allKeys = Reflect.ownKeys(a);
  // 数组需特殊判断下
  const newObj = Array.isArray(a) ? [] : {};
  // 缓存引用
  weakMap.set(a, newObj);
  for (const key of allKeys) {
    const value = a[key];
    const T = typeof value;
    // 如果是基础类型或 null，直接赋值
    if (value === null || T !== 'object') {
      newObj[key] = value;
      continue;
    }
    const objT = Object.prototype.toString.call(value);
    // 如果是普通对象或者数组，递归赋值
    if (objT === '[object Object]' || objT === '[object Array]') {
      newObj[key] = deepClonePlus(value, weakMap);
      continue;
    }
    // 如果是 Set 或者 Map，需要特殊处理
    if (objT === '[object Set]' || objT === '[object Map]') {
      if (objT === '[object Set]') {
        newObj[key] = new Set();
        value.forEach((v) => newObj[key].add(deepClonePlus(v, weakMap)));
      } else {
        newObj[key] = new Map();
        value.forEach((v, i) => newObj[key].set(i, deepClonePlus(v, weakMap)));
      }
      continue;
    }
    // 如果是 Symbol 也要特殊处理
    if (objT === '[object Symbol]') {
      newObj[key] = Object(Symbol.prototype.valueOf.call(value));
      continue;
    }
    // 其余的都是内置对象或者不需要递归处理的对象，直接基于这些对象原型的构造函数来实例化相应的对象
    newObj[key] = new a[key].constructor(value);
  }
  return newObj;
}
```
