---
title: 堆的添加和弹出
date: 2022-06-24 14:06:00
authors: NoraH1to
tags:
  - 堆
  - 数据结构
---

我们以最小堆为例子，讲解如何添加、弹出堆中的元素

## 添加

优先队列先进先出，所以从队尾添加：

1. 添加到队尾

2. 检查是否小于父节点，是则上浮直到大于等于父节点

```javascript
function minHeapAdd(array = [], element) {
  array.push(element);
  if (array.length > 1) {
    // 插入元素的索引
    let index = array.length - 1;
    // 父元素索引
    let parent = Math.floor((index - 1) / 2);
    // 直到没有父元素
    while (parent >= 0) {
      // 如果当前元素小于父元素
      if (array[index] < array[parent]) {
        // 交换元素位置
        [array[index], array[parent]] = [array[parent], array[index]];
        // 更新当前元素索引
        index = parent;
        // 更新当前元素的父元素索引
        parent = Math.floor((index - 1) / 2);
      } else {
        break;
      }
    }
  }
  return array;
}
```

## 弹出

优先队列先进先出，所以从头部弹出：

1. 取出头部，并把尾部节点放到原头部位置

2. 调整堆为最小堆（用到了[构建最小堆](../build#最小堆)中的函数）

```javascript
function minHeapPop(array = []) {
  let result = null;
  // 如果堆有超过 1 个元素
  if (array.length > 1) {
    // 取出根节点
    result = array[0];
    // 尾部节点放到根节点位置
    array[0] = array.pop();
    // 从树根节点开始调整为最小堆
    adjustMinHeap(array, 0, array.length);
  } else if (array.length === 1) {
    // 如果只有一个元素就直接弹出节点
    return array.pop();
  }
  return result;
}
```
