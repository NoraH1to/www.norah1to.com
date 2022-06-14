---
title: 比较运算符
date: 2022-06-13 15:20:00
authors: NoraH1to
tags:
  - Javascript
  - 运算符
---

> 本文参考了：[我对 JS 中相等和全等操作符转化过程一直很迷惑，直到有了这份算法](https://juejin.cn/post/6844903960889786381)

比较运算符可以简单分为两类：

- 严格比较

- 非严格比较

## 严格比较

`===`,`!==` 都是严格比较，`!==` 是 `===` 的结果取反，`===` 规则如下：

1. 如果两个操作数有不同的类型，它们不是严格相等的

2. 如果两个操作数都为 `null`，则它们是严格相等的

3. 如果两个操作数都为 `undefined`，它们是严格相等的

4. 如果一个或两个操作数都是 `NaN`，它们就不是严格相等的

5. 如果两个操作数都为 `true` 或都为 `false`，它们是严格相等的

6. 如果两个操作数都是 `number` 类型并且具有相同的值，则它们是严格相等的

7. 如果两个操作数都是 `string` 类型并且具有相同的值，则它们是严格相等的

8. 如果两个操作数都引用相同的对象或函数，则它们是严格相等的

9. 以上所有其他情况下操作数都不是严格相等的

## 非严格比较

`==`,`!=`,`>`,`<`,`>=`,`<=` 都是非严格比较，`==` 比较步骤如下：

1. 如果操作数具有相同的类型，使用上面的[严格比较](#严格比较)验证它们是否严格相等

2. 如果操作数有不同的类型：

   1. 如果一个操作数为 `null` 而另一个 `undefined`，则它们相等

   2. 如果一个值是数字，另一个是字符串，先将字符串转换为数字，然后使用转换后的值比较

   3. 如果一个操作数是布尔值，则将 `true` 转换为 `1`，将 `false` 转换为 `0`，然后使用转换后的值比较

   4. 如果一个操作数是一个对象，而另一个操作数是一个数字或字符串，则使用[对象转换规则](#对象转换规则)将该对象转换为原始值，再使用转换后的值比较

3. 在以上的其他情况下，操作数都不相等

比较大小只有一点不同：在最后不通过比较值是否相等，而是根据运算符的逻辑来返回结果，例如 `a >= b` 在 `a` 的值**大于或者等于** `b` 的值的时候返回 `true`，否则返回 `false`

## 对象转换规则

在一个对象上：

1. 如果方法 `valueOf()` 存在，则调用它；如果 `valueOf()` 返回一个原始值，JS 将这个值转换为字符串（如果本身不是字符串的话），并返回这个字符串结果

2. 如果方法 `toString()` 存在，则调用它；如果 `toString()` 返回一个原始值，JS 将这个值转换为字符串（如果本身不是字符串的话），并返回这个字符串结果。需要注意，原始值到字符串的转换

3. 否则，JS 无法从 `toString()` 或 `valueOf()` 获得一个原始值，它将抛出一个 `TypeError: Cannot convert object to primitive value` 无法转换对象为原始值的错误