---
title: 栈和队列
date: 2022-06-24 14:50:00
authors: NoraH1to
tags:
  - 栈
  - 队列
  - 数据结构
---

栈和队列属于**线性结构**，他们之间值的取出操作有区别

## 栈

先进后出

用数组来模拟：

```javascript
function stack(arr = []) {
  this.value = arr.slice();
}
stack.prototype = {
  add: function (item) {
    this.value.push(item);
  },
  pop: function () {
    return this.value.pop();
  },
};

const s = new stack([1, 2, 3]);
s.add(4); // [1, 2, 3, 4]
s.pop(); // 4 -> [1, 2, 3]
```

## 队列

先进先出

用数组来模拟：

```javascript
function queues(arr = []) {
  this.value = arr.slice();
}
queues.prototype = {
  add: function (item) {
    this.value.push(item);
  },
  pop: function () {
    return this.value.shift();
  },
};

const q = new queues([1, 2, 3]);
q.add(4); // [1, 2, 3, 4]
q.pop(); // 1 -> [2, 3, 4]
```
