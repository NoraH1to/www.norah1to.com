---
title: 响应式监听
date: 2022-05-08 15:24:00
authors: NoraH1to
tags:
  - Vue
  - Vue3
  - 响应式系统
---

## watch 和 watchEffect 监听行为的不同

`watch` 会监听引用类型上所有 **响应式** 的值

`watchEffect` 只会监听收集到的依赖本身的引用或值是否发生改变，其收集行为跟 `react` 中 `useEffect` 的依赖列表类似

例如

```javascript
import { reactive, watchEffect, watch } from 'vue';

const data = reactive({ deep: { count: 0 } });
const addCount = () => {
  data.deep.count++;
};

watchEffect(() => {
  console.log('watchEffect: ref', data);
});

watchEffect(() => {
  console.log('watchEffect: value', data.deep.count);
});

watch(data, (nV) => {
  console.log('watch', nV);
});

setTimeout(addCount, 1000);
```

打印结果应该是这样的

```bash
# effect 会立即执行一次
watchEffect: ref ▶Proxy {...}
watchEffect: value 0

# 一秒钟后
watchEffect: value 1
watch ▶Proxy {...}
```

只收集了 `data` 的 `watchEffect` 没有执行

## watch 只能监听响应式变化

简单举几个例子

❌

```javascript {9-9}
import { reactive, watch } from 'vue';

let data = reactive({ count: 0 });

watch(data, (nV) => {
  console.log('watch', nV);
});

data = reactive({ count: 1 }); // 不会触发上面的监听器
```

✅

```javascript {4-4,6-6,10-10}
import { reactive, watch, ref } from 'vue';

const data = reactive({ count: 0 });
const dataRef = ref(data);

watch(dataRef, (nV) => {
  console.log('watch', nV);
});

dataRef.value = reactive({ count: 1 });
```

✅

```javascript {4-4,6-6,10-10}
import { reactive, watch } from 'vue';

const data = reactive({ count: 0 });
const dataRef = reactive({ value: data });

watch(dataRef, (nV) => {
  console.log('watch', nV.value);
});

dataRef.value = reactive({ count: 1 });
```
