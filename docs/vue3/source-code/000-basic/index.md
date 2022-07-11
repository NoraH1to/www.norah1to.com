---
title: 前置知识
date: 2022-07-05 20:34:00
authors: NoraH1to
---

## 知识储备

阅读后文需要以下知识储备：

- `ESNEXT` 最新规范

- 理解 `vue2` 文档中编写的响应式原理

- `pnpm` 和其 `workspace` 的使用，了解 `pnpm link` 指令

## 本人开发环境

- 操作系统：`Windows11 x64 专业版`

- IDE：`vscode 最新稳定版`

- 调试项目 `package.json` 依赖版本

  ```json
  {
    "dependencies": {
      "vue": "^3.2.37"
    },
    "devDependencies": {
      "@vitejs/plugin-vue": "^2.3.3",
      "@vitejs/plugin-vue-jsx": "^1.3.10",
      "sass": "^1.53.0",
      "typescript": "^4.7.4",
      "vite": "^2.9.13",
      "vue-tsc": "^0.38.2"
    }
  }
  ```

## 版本要求

- node：`>= v16.5.0`

- vue 源码：`v3.2.37`

- 包管理工具 pnpm：`>= 7.5.0`

## 如何调试

- 首先把仓库克隆下来：

  ```shell
  git clone git@github.com:vuejs/core.git
  ```

- 进入到项目目录，然后切换到我们的调试版本：

  ```shell
  cd core

  git checkout v3.2.37
  ```

- 安装依赖，完整的编译一次：

  ```shell
  pnpm i
  # -t 表示同时编译类型文件，-s 表示 sourceMap 文件
  pnpm build -t -s
  ```

- 将需要调试的包用开发模式跑起来：

  例如我们要跑 reactivity 这个包，并且是用 vite 调试

  ```shell
  # -f esm-bundler 表示开发模式打包为 esm 格式，vite 默认会用 module 来编译，所以需要为该格式
  pnpm dev reactivity -f esm-bundler -s
  ```

  此时 `packages/reactivity/src` 下的文件都支持实时调试了
