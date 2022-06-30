---
title: 前置知识
date: 2022-06-30 14:55:00
authors: NoraH1to
tags:
  - webpack
  - 工程化
  - webpack插件
---

## Tapable

`Tapable` 是一个事件发布订阅库，提供了各种同步、异步的事件订阅发布方法

`webpack` 通过 `Tapable` 暴露了大量的事件给插件开发者注册，开发者通过这些事件来介入编译打包的过程

学习 `Tapable` 看[这篇文章](https://juejin.cn/post/7040982789650382855)，写的很好

## webpack 插件机制

`webpack` 暴露了非常非常多的 `hook` 供开发者注册，他们存在于不同的对象上，不同对象的钩子分工明确，涵盖了**编译、资源文件**等各种场景

看[这篇文章](https://juejin.cn/post/7046360070677856292)，了解插件的开发方式、其大致结构和较常用的几个钩子对象

## webpack 钩子文档

- [compiler（常用）](https://www.webpackjs.com/api/compiler-hooks/)

- [compilation（常用）](https://www.webpackjs.com/api/compilation-hooks/)

- [parser（需要处理源码时常用）](https://www.webpackjs.com/api/parser/)

- [resolver](https://www.webpackjs.com/api/resolvers/)
