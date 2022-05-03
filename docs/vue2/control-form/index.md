---
title: 受控表单
date: 2022-04-24 22:14:46
authors: NoraH1to
tags:
  - Vue
  - Vue2
  - 封装
---

# 受控表单

## 发生甚么事了

最近在掘金摸鱼时，遇到了好几篇关于在 `vue2` 中封装表单的文章，什么提效 `200%` 叭叭叭的说的天花乱坠

点进去一看，其实就是把表单封装成一个**可配置的巨型组件**，模板语法里一大堆 `v-if` `v-else-if`

我个人认为，这种封装方式不太可取，原因有以下几点：

1. 它完全是把写模板的代码量转移到了配置上，实质上只是换了一种写法，工作量并没有减少多少

2. 不仅要理解封装后组件的使用方法，还需要熟悉原始表单组件的使用方法

3. 并且如果稍微增加、变动几个需求或者换个表单组件，一座没法维护的 💩 山就形成了

<!--truncate-->

总结一下较高层抽象的表单封装需求：

1. 可以替换不同的组件库

2. 可以灵活应对业务逻辑的变化

3. 使用成本低

这么一看，可以抽离的只有围绕**表单数据**的逻辑，那么就只有一种方法了！

> 只对**数据**进行抽象封装，模板中的组件**消费**这些数据

## 撸码

首先整一个简单的表单出来

```html title="components/FormControl/index.vue"
<!-- components/FormControl/index.vue -->

<template>
  <el-form ref="form" :model="formData" label-width="80px">
    <el-form-item label="姓名" prop="name">
      <el-input v-model="formData.name"></el-input>
    </el-form-item>
    <el-form-item label="性别" prop="sex">
      <el-radio v-model="formData.sex" label="1">男</el-radio>
      <el-radio v-model="formData.sex" label="2">女</el-radio>
    </el-form-item>
    <el-form-item label="年龄" prop="age">
      <el-input-number v-model="formData.age"></el-input-number>
    </el-form-item>
  </el-form>
</template>

<script>
  export default {
    data() {
      return {
        formData: {
          name: undefined,
          sex: '1',
          age: undefined,
        },
      };
    },
  };
</script>
```

我们简单的思考下，表单一般都是**增、改**两种操作，那么表单应该能接受一个**初始值**

那么外部需要能够**控制组件内部的值**，也就是一个**受控组件**

这时候不妨贯彻下 `vue2` 的一些组件思维，直接把数据做成双向绑定 (`v-model`)，减少组件的使用理解成本

双向绑定语法糖需要实现这两个点:

1. 外部值变化时，组件内部同步更新

2. 组件内部值变化时，外部值同步更新

### 双向绑定配置

在实例中配置 `model`，配置接收属性为 `data`，更新外部数据的事件为 `update:data`

在外部既可以使用 `v-mode` 也可以使用 `.sync` 修饰符

```javascript title="components/FormControl/index.vue - script" {4-7}
// components/FormControl/index.vue - script

export default {
  model: {
    prop: 'data',
    event: 'update:data',
  },
  ...
};
```

### 外部值变化，更新内部值

首先需要接收一个外部的值 `data`

```javascript title="components/FormControl/index.vue - script" {5-11}
// components/FormControl/index.vue - script

export default {
  ...
  props: {
    data: {
      type: Object,
      required: false,
      default: () => ({}),
    },
  },
  ...
};
```

在实例内部监听 `data` 的变化

大部分情况下表单编辑的初始值都是异步获取的，但是有些需求是外部组件写死的默认值，这种情况下如果没有立刻同步会导致初始值无效

所以需要立即把 `data` 的值更新到 `formData` 中，即 `immediate: true`

```javascript title="components/FormControl/index.vue - script" {10-20}
// components/FormControl/index.vue - script

export default {
  ...
  data() {
    return {
      formData: { ... },
    };
  },
  watch: {
    data: {
      handler(newData) {
        Object.keys(newData).forEach((k) =>
          this.$set(this.formData, k, newData[k]),
        );
      },
      deep: true,
      immediate: true,
    },
  },
};
```

### 内部值变化，更新外部值

直接在实例中监听 `formData`

因为初始值是外部决定的，所以无需设置 `immediate`

```javascript title="components/FormControl/index.vue - script" {12-21}
// components/FormControl/index.vue - script

export default {
  ...
  data() {
    return {
      formData: { ... },
    };
  },
  watch: {
    ...
    formData: {
      handler(n) {
        /**
         * 这里用解构是为了让外部数据和内部数据不是同一个引用
         * 防止出现内存泄漏或其它奇奇怪怪的引用引起的bug
         */
        this.$emit('update:data', { ...n });
      },
      deep: true,
    },
  },
};
```

### 完整组件代码

```html title="components/FormControl/index.vue"
<!-- components/FormControl/index.vue -->

<template>
  <el-form ref="form" :model="formData" label-width="80px">
    <el-form-item label="姓名" prop="name">
      <el-input v-model="formData.name"></el-input>
    </el-form-item>
    <el-form-item label="性别" prop="sex">
      <el-radio v-model="formData.sex" label="1">男</el-radio>
      <el-radio v-model="formData.sex" label="2">女</el-radio>
    </el-form-item>
    <el-form-item label="年龄" prop="age">
      <el-input-number v-model="formData.age"></el-input-number>
    </el-form-item>
  </el-form>
</template>

<script>
  export default {
    model: {
      prop: 'data',
      event: 'update:data',
    },
    props: {
      data: {
        type: Object,
        required: false,
        default: () => ({}),
      },
    },
    data() {
      return {
        formData: {
          name: undefined,
          sex: '1',
          age: undefined,
        },
      };
    },
    watch: {
      data: {
        handler(newData) {
          Object.keys(newData).forEach((k) =>
            this.$set(this.formData, k, newData[k])
          );
        },
        deep: true,
        immediate: true,
      },
      formData: {
        handler(n) {
          // 这里用解构是为了不让外部数据和内部数据都是同一个引用，防止出现内存泄漏的问题
          this.$emit('update:data', { ...n });
        },
        deep: true,
      },
    },
  };
</script>
```

### 试试效果

直接在页面中引用

```html title="index.vue"
<!-- index.vue -->

<template>
  <form-control v-model="formData" />
</template>

<script>
  import FormControl from './FormControl.vue';
  export default {
    components: {
      FormControl,
    },
    data() {
      return {
        formData: {
          name: 'norah1to',
          sex: '1',
          age: 23,
        },
      };
    },
  };
</script>
```

双向绑定成功

![效果](./test1.gif)

### 抽取公共逻辑

简单分析下 `script` 标签中的代码，可以很简单的发现，除了 `formData` 里的数据结构，其它都是能复用的部分，于是可以这样封装一个 `mixin`

```javascript title="components/FormControl/mixins/control.js"
// components/FormControl/mixins/control.js

/**
 * control
 * @param {Record} model
 */
const control = (model = {}, propName = 'data') => ({
  model: {
    prop: `${propName}`,
    event: `update:${propName}`,
  },
  props: {
    [`${propName}`]: {
      type: Object,
      required: false,
      default: () => ({}),
    },
    immediate: {
      type: Boolean,
      required: false,
      default: true,
    },
  },
  data() {
    return {
      formData: {
        ...model,
      },
    };
  },
  watch: {
    formData: {
      handler(n) {
        this.$emit(`update:${propName}`, { ...n });
      },
      deep: true,
    },
  },
  created() {
    this.$watch(
      `${propName}`,
      (newData) => {
        Object.keys(newData).forEach((k) =>
          this.$set(this.formData, k, newData[k])
        );
      },
      { deep: true, immediate: this.immediate }
    );
  },
});

export default control;
```

这里我还做了一点小优化：

1. 有时需要自定义双向绑定的变量名，所以混入的第二个的参数用于自定义变量名，默认值为 `data`

1. 前面说过异步场景下监听外部 `data` 时可以不需要 `immediate`，于是我把这个监听器改为可控的，通过 `immediate` 传参控制，在最早可以拿到传参的 `created` 生命周期手动监听

### 改造表单组件

使用成本非常低，只需要记住内部数据是存储在 `formData` 中即可

加上混入后`script` 标签中的内容简化至 4 行

```html title="components/FormControl/index.vue" {5-8}
<!-- components/FormControl/index.vue -->

...
<script>
  import control from './mixins/control';
  export default {
    mixins: [control({ name: undefined, sex: '1', age: undefined })],
  };
</script>
```

### 最终结果，全部代码

```html title="index.vue"
<!-- index.vue -->

<template>
  <form-control v-model="formData" />
</template>

<script>
  import FormControl from './FormControl.vue';
  export default {
    components: {
      FormControl,
    },
    data() {
      return {
        formData: {
          name: 'NoraH1to',
          sex: '1',
          age: 23,
        },
      };
    },
  };
</script>
```

```html title="components/FormControl/index.vue"
<!-- components/FormControl/index.vue -->

<template>
  <el-form ref="form" :model="formData" label-width="80px">
    <el-form-item label="姓名" prop="name">
      <el-input v-model="formData.name"></el-input>
    </el-form-item>
    <el-form-item label="性别" prop="sex">
      <el-radio v-model="formData.sex" label="1">男</el-radio>
      <el-radio v-model="formData.sex" label="2">女</el-radio>
    </el-form-item>
    <el-form-item label="年龄" prop="age">
      <el-input-number v-model="formData.age"></el-input-number>
    </el-form-item>
  </el-form>
</template>

<script>
  import control from './control';
  export default {
    mixins: [control({ name: undefined, sex: '1', age: undefined })],
  };
</script>
```

```javascript title="components/FormControl/mixins/control.js 混入"
// components/FormControl/mixins/control.js 混入

/**
 * control
 * @param {Record} model
 */
const control = (model = {}, propName = 'data') => ({
  model: {
    prop: `${propName}`,
    event: `update:${propName}`,
  },
  props: {
    [`${propName}`]: {
      type: Object,
      required: false,
      default: () => ({}),
    },
    immediate: {
      type: Boolean,
      required: false,
      default: true,
    },
  },
  data() {
    return {
      formData: {
        ...model,
      },
    };
  },
  watch: {
    formData: {
      handler(n) {
        this.$emit(`update:${propName}`, { ...n });
      },
      deep: true,
    },
  },
  created() {
    this.$watch(
      `${propName}`,
      (newData) => {
        Object.keys(newData).forEach((k) =>
          this.$set(this.formData, k, newData[k])
        );
      },
      { deep: true, immediate: this.immediate }
    );
  },
});

export default control;
```

## 总结

看到这你会发现，这只是一个很简单的双向绑定封装，大家别小看它，这是我后面很多实践的基石

我个人在很多业务中都有实践，并且通过和其它的混入组合，产生更多的化学反应，大大提高~~搬砖~~生产效率

它贵在通用性、易用性和可扩展性强，并且 `vue2` 的复用方式真的不多，选择混入属于是无奈之举（下个季度公司项目会逐渐迁移到 vue3，好耶！）

混入非常容易让使用者混乱，大家千万不要做**侵入性过强、属性过多**的混入封装，**一切从简**

后续我会写一些组合使用混入达到提效目的的文章，做 B 端开发的同学可以留意下
