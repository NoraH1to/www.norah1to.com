---
title: 响应式系统
date: 2022-05-10 16:06:00
authors: NoraH1to
tags:
  - Vue
  - Vue3
  - 响应式系统
---

## ref 在 reactive 中会被解包

例如我们有一个被 `ref` 处理过的值，取值需要取其 `value`

```javascript
const count = ref(0);
console.log(count.value); // 0
```

在以下两种情况下，**不能**通过 `value` 取值

```javascript
const reactA = reactive({ count });
console.log(reactA.count.value); // undefined
console.log(reactA.count); // 0

const reactB = reactive({});
reactB.count = count;
console.log(reactB.count.value); // undefined
console.log(reactB.count); // 0
```

> 只会在响应式的 `Object` 嵌套时生效，`Array`,`Map` 诸如此类的原生集合不会解包

## makeRaw 只会对根级别生效

`makeRaw` 的作用是防止某对象成为响应式的、保持对象为原始对象的接口，详情请参考[makeRaw 文档](https://v3.cn.vuejs.org/api/basic-reactivity.html#markraw)

```javascript
const target = markRaw({
  deepObj: {},
});

const reactA = reactive(target); // 会返回对象原本的引用，而不是响应式的新引用
console.log(reactA === target); // true

const reactB = reactive(target.deepObj); // 会返回响应式的新引用
console.log(reactB === target.deepObj); // false
```

## toRefs 不会处理嵌套的对象

```javascript
const target = reactive({ deep: { count: 0 } });
const { deep } = toRefs(target);
console.log(deep.value); // { count: 0 }
```
