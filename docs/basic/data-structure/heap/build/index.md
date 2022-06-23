---
title: 构建堆
date: 2022-06-23 16:20:00
authors: NoraH1to
tags:
  - 堆
  - 最大堆
  - 最小堆
  - 数据结构
---

## 最大堆

从最后一个非叶子节点开始：

1. 和孩子节点的最大值比较

2. 大于 - 不需要继续下沉

3. 小于 - 和最大值交换位置，继续和下一层孩子重复 `1`,`2`,`3`

```javascript
function adjustMaxHeap(array, index, length) {
  // 每次循环都从从当前节点的左孩子开始
  for (let i = 2 * index + 1; i < length; i = 2 * i + 1) {
    // 如果右孩子存在且大于左孩子，指针指向右孩子
    if (i + 1 < length && array[i + 1] > array[i]) {
      i++;
    }
    // 如果当前节点大于等于最大的孩子节点，无需替换
    if (array[index] >= [array[i]]) {
      break;
    } else {
      // 否则交换两节点的值，记录节点值的新下标，继续下沉
      [array[index], array[i]] = [array[i], array[index]];
      index = i;
    }
  }
}

function createMaxHeap(arr, length) {
  // 从最后一个非叶子节点开始，向堆顶遍历处理
  for (let i = Math.floor(length / 2) - 1; i >= 0; i--) {
    adjustMaxHeap(arr, i, length);
  }
  return arr;
}
```

## 最小堆

从最后一个非叶子节点开始：

1. 和孩子节点的最小值比较

2. 小于 - 不需要继续下沉

3. 大于 - 和最小值交换位置，继续和下一层孩子重复 `1`,`2`,`3`

```javascript
function adjustMinHeap(array, index, length) {
  // 每次循环都从从当前节点的左孩子开始
  for (let i = 2 * index + 1; i < length; i = 2 * i + 1) {
    // 如果右孩子存在且小于左孩子，指针指向右孩子
    if (i + 1 < length && array[i + 1] < array[i]) {
      i++;
    }
    // 如果当前节点小于等于最小的孩子节点，无需替换
    if (array[index] < [array[i]]) {
      break;
    } else {
      // 否则交换两节点的值，记录节点值的新下标，继续下沉
      [array[index], array[i]] = [array[i], array[index]];
      index = i;
    }
  }
}

function createMinHeap(arr, length) {
  // 从最后一个非叶子节点开始，向堆顶遍历处理
  for (let i = Math.floor(length / 2) - 1; i >= 0; i--) {
    adjustMinHeap(arr, i, length);
  }
  return arr;
}
```
