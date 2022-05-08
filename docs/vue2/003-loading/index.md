---
title: 加载状态
date: 2022-04-26 22:26:00
authors: NoraH1to
tags:
  - Vue
  - Vue2
  - 封装
  - http请求
---

## 发生甚么事了

什么都没发生，纯纯的总结下搬砖技巧罢了

业务中的加载状态需求一般如下:

1. 状态粒度细分到组件

2. 同时能够拥有一个较为宏观的加载状态

3. 使用方便，理解简单，弱代码入侵

这么一看，害挺简单，转换成逻辑就是这样:

1. 能通过一个 `name` 设置其 `name` 对应的加载状态

2. 能够自定义聚合加载状态的粒度

3. 使用者需要用到的 api 越少越好

<!--truncate-->

## 撸码

个人经过仔细思考，决定通过**两个**混入的组合，来实现上述需求

### 匿名加载栈

说人话就是维护一个队列，加载时推入数据，加载结束取出，队列长度不为 `0` 即是加载中

这里肯定有人会问，你为啥不直接做成一个计数器？纯纯的浪费性能！

其实这边设计成队列是有超前的考虑，我们如果在结束请求前组件销毁了，那么请求会自动撤销吗？不会，所以可能会出现内存泄漏的问题

为了解决这个问题，一开始是打算在请求工具方法上挂一个撤销请求的方法，然后在 `beforeDestroy` 遍历撤销请求的，但是因为业务需求不停的来，加上我们公司使用了**微前端**的同时**维护公共工具**的方法是**发布到私有 npm 上**，所以统一更新很麻烦，就不了了之了 (以后必补上！)

并且这个东西只要有思路就很好做，不同的请求库封装方式也不同，我这边只给最通用的方案，哔哔一大堆，是时候上代码了

---

首先声明一个队列，并且声明一个计算属性 `loading` 表示加载状态

```javascript title="mixins/loading.js" {2-11}
export default {
  data() {
    return {
      mixinsLoadingList: [],
    };
  },
  computed: {
    loading() {
      return !!this.mixinsLoadingList.length;
    },
  },
};
```

这边的加载队列 `mixinsLoadingList` 是私有的，其实建议用 `uuid` 或类似的唯一键库来随机生成变量名防止他人非法使用，这样大家就只会用到你开放的"接口"，后续方便进行行为不变的重构、升级等操作

---

接着定义我们的核心方法 `setLoading`，接收一个参数类型为 `boolean | Promise`

```javascript title="mixins/loading.js" {12-24}
export default {
  data() {
    return {
      mixinsLoadingList: [],
    };
  },
  computed: {
    loading() {
      return !!this.mixinsLoadingList.length;
    },
  },
  methods: {
    setLoading(flag) {
      // 如果是 Promise 的情况
      if (flag instanceof Promise) {
        this.mixinsLoadingList.push(true);
        // 外侧可能要使用 await，所以返回 Promise
        return flag.finally(() => this.mixinsLoadingList.pop());
      }
      // 如果是其它一律当成布尔值
      if (flag) this.mixinsLoadingList.push(flag);
      else this.mixinsLoadingList.pop();
    },
  },
};
```

好！到这里是不是你就觉得大功告成了？

---

增加事件方便外部监听局部加载状态

```javascript title="mixins/loading.js" {12-16}
export default {
  data() {
    return {
      mixinsLoadingList: [],
    };
  },
  computed: {
    loading() {
      return !!this.mixinsLoadingList.length;
    },
  },
  watch: {
    loading(v) {
      this.$emit('loading', v);
    },
  },
  methods: {
    setLoading(flag) {
      // 如果是 Promise
      if (flag instanceof Promise) {
        this.mixinsLoadingList.push(true);
        // 外侧可能要使用 await，所以返回 Promise
        return flag.finally(() => this.mixinsLoadingList.pop());
      }
      // 如果是其它一律当成布尔值
      if (flag) this.mixinsLoadingList.push(flag);
      else this.mixinsLoadingList.pop();
    },
  },
};
```

为什么要这样做呢，举个例子，如果有一个组件，它的子组件里面包含了很多的加载状态，该组件的加载状态需要根据子组件加载状态来计算，那么！

```html
<template>
  <div v-loading="loading">
    <child @loading="setLoading" />
    <child @loading="setLoading" />
    <child @loading="setLoading" />
    <child @loading="setLoading" />
  </div>
</template>

<script>
  import loading from './mixins/loading';
  export default {
    mixins: [loading],
  };
</script>
```

十分方便

### 具名加载栈

其实非常简单，就是在匿名加载栈的基础上调整了一下，维护了一个哈希表，还多了一些报错处理

---

因为是具名的，该混入需要接收一个参数 `name` 来生成，并且维护一个哈希表 `mixinsLoadingMap`

```javascript title="mixins/loadingSth.js" {1-9}
const loadingSth = (name) => ({
  data() {
    return {
      mixinsLoadingMap: {
        [name]: [],
      },
    };
  },
});
```

---

因为是具名的，所以不能利用计算属性了，需要编写获得加载状态的方法 `getLoadingSth`

```javascript title="mixins/loadingSth.js" {9-16}
const loadingSth = (name) => ({
  data() {
    return {
      mixinsLoadingMap: {
        [name]: [],
      },
    };
  },
  methods: {
    getLoadingSth(name) {
      // 如果不存在，则没有该具名混入，抛出错误
      if (this.mixinsLoadingMap[name] === undefined)
        throw 'undefined loading state';
      return !!this.mixinsLoadingMap[name].length;
    },
  },
});
```

---

接着是设置加载状态的方法，和上面大同小异

```javascript title="mixins/loadingSth.js" {16-29}
const loadingSth = (name) => ({
  data() {
    return {
      mixinsLoadingMap: {
        [name]: [],
      },
    };
  },
  methods: {
    getLoadingSth(name) {
      // 如果不存在，则没有该具名混入，抛出错误
      if (this.mixinsLoadingMap[name] === undefined)
        throw 'undefined loading state';
      return !!this.mixinsLoadingMap[name].length;
    },
    setLoadingSth(name, flag) {
      // 如果不存在，则没有该具名混入，抛出错误
      if (this.mixinsLoadingMap[name] === undefined)
        throw 'undefined loading state';
      // 如果是 Promise
      if (flag instanceof Promise) {
        this.mixinsLoadingMap[name].push(true);
        // 外侧可能要使用 await，所以返回 Promise
        return flag.finally(() => this.mixinsLoadingMap[name].pop());
      }
      // 如果是其它一律当成布尔值
      if (flag) this.mixinsLoadingMap[name].push(flag);
      else this.mixinsLoadingMap[name].pop();
    },
  },
});
```

---

最后是抛出的事件，事件名为 `loading:{名称}`

```javascript title="mixins/loadingSth.js" {31-37}
const loadingSth = (name) => ({
  data() {
    return {
      mixinsLoadingMap: {
        [name]: [],
      },
    };
  },
  methods: {
    getLoadingSth(name) {
      // 如果不存在，则没有该具名混入，抛出错误
      if (this.mixinsLoadingMap[name] === undefined)
        throw 'undefined loading state';
      return !!this.mixinsLoadingMap[name].length;
    },
    setLoadingSth(name, flag) {
      // 如果不存在，则没有该具名混入，抛出错误
      if (this.mixinsLoadingMap[name] === undefined)
        throw 'undefined loading state';
      // 如果是 Promise
      if (flag instanceof Promise) {
        this.mixinsLoadingMap[name].push(true);
        // 外侧可能要使用 await，所以返回 Promise
        return flag.finally(() => this.mixinsLoadingMap[name].pop());
      }
      // 如果是其它一律当成布尔值
      if (flag) this.mixinsLoadingMap[name].push(flag);
      else this.mixinsLoadingMap[name].pop();
    },
  },
  watch: {
    [`mixinsLoadingMap.${name}.length`]: {
      handler(v) {
        this.$emit(`loading:${name}`, !!v);
      },
    },
  },
});
```

### 示例

来个小例子让大家更好理解

```html title="index.vue"
<template>
  <div class="container">
    <el-button @click="initData">请求数据</el-button>
    <el-card v-loading="loadingTotal">
      <div class="card-content">加载全部</div>
    </el-card>
    <el-card v-loading="getLoadingSth('A')">
      <div class="card-content">加载A</div>
    </el-card>
    <el-card v-loading="getLoadingSth('B')">
      <div class="card-content">加载B</div>
    </el-card>
    <el-card v-loading="loading">
      <div class="card-content">加载C</div>
    </el-card>
  </div>
</template>

<script>
  import loadingSth from './mixins/loadingSth';
  import loading from './mixins/loading';

  // 收集需要表示为总加载状态的具名加载状态
  const loadingItems = ['A', 'B'];

  export default {
    mixins: [loading, ...loadingItems.map(loadingSth)],
    computed: {
      loadingTotal() {
        return (
          this.loading || loadingItems.map(this.getLoadingSth).some((v) => !!v)
        );
      },
    },
    mounted() {
      this.initData();
    },
    methods: {
      initData() {
        this.requestDataA();
        this.requestDataB();
        this.requestDataC();
      },
      async requestDataA() {
        await this.setLoadingSth('A', this.sleep(1000));
        this.$message('A done');
      },
      async requestDataB() {
        await this.setLoadingSth('B', this.sleep(5000));
        this.$message('B done');
      },
      async requestDataC() {
        await this.setLoading(this.sleep(3000));
        this.$message('C done');
      },
      async sleep(delay) {
        await new Promise((resolve) => {
          setTimeout(() => resolve(true), delay);
        });
      },
    },
  };
</script>

<style lang="scss" scoped>
  .container {
    display: flex;
    flex-direction: column;
    .el-card {
      flex-shrink: 0;
      margin-top: 16px;
    }
    .card-content {
      height: 100px;
      line-height: 100px;
      text-align: center;
    }
  }
</style>
```

同时还有另一种利用**匿名具名混合的使用**计算总加载状态的方法

```html title="index.vue"
<template>
  <div class="container">
    <el-button @click="initData">请求数据</el-button>
    <el-card v-loading="loading">
      <div class="card-content">加载全部</div>
    </el-card>
    <el-card v-loading="getLoadingSth('A')">
      <div class="card-content">加载A</div>
    </el-card>
    <el-card v-loading="getLoadingSth('B')">
      <div class="card-content">加载B</div>
    </el-card>
  </div>
</template>

<script>
  import loadingSth from './mixins/loadingSth';
  import loading from './mixins/loading';

  const loadingItems = ['A', 'B'];

  export default {
    mixins: [loading, ...loadingItems.map(loadingSth)],
    mounted() {
      this.initData();
    },
    methods: {
      initData() {
        this.requestDataA();
        this.requestDataB();
      },
      async requestDataA() {
        await this.setLoading(this.setLoadingSth('A', this.sleep(1000)));
        this.$message('A done');
      },
      async requestDataB() {
        await this.setLoading(this.setLoadingSth('B', this.sleep(5000)));
        this.$message('B done');
      },
      async sleep(delay) {
        await new Promise((resolve) => {
          setTimeout(() => resolve(true), delay);
        });
      },
    },
  };
</script>

<style lang="scss" scoped>
  .container {
    display: flex;
    flex-direction: column;
    .el-card {
      flex-shrink: 0;
      margin-top: 16px;
    }
    .card-content {
      height: 100px;
      line-height: 100px;
      text-align: center;
    }
  }
</style>
```

## 总结

真的很好用，谁用谁知道，跨两三层组件共享状态也是非常方便的

当然也有缺点，状态只会从下往上冒泡，不能在子组件获得父组件的状态

当然这也不能算作缺点，如果子组件依赖父组件的加载状态，那么应该把加载状态都提升到父组件才对！是使用者设计不当！
