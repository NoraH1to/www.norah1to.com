---
title: 作用域
date: 2022-06-15 14:28:00
authors: NoraH1to
tags:
  - Javascript
  - ES6
---

## 作用域

作用域可以理解为变量存储的环境，你只能获取到当前作用域和上级作用域的变量

当前作用域找不到的变量会往上级作用域找，到头了还找不到就抛出变量未定义的错误

### ES5

在 ES6 提出新的词法环境概念前，只有两种作用域：

- 函数作用域：

  在函数体内使用 `var` 声明变量，就会形成一个函数作用域

  ```javascript
  function foo() {
    // 这里面就形成了一个作用域
    var bar = 'bar';
  }
  ```

- 全局作用域：

  在除函数体的任意位置使用 `var` 声明变量，这个变量属于全局作用域

  ```javascript
  var a = 'a'; // 属于全局作用域
  function foo() {
    // 这里面就形成了一个作用域
    var bar = 'bar';
  }
  ```

函数内部可以获得全局（上级）作用域的变量，声明在函数中的变量在外部获取不到：

```javascript
var foo = 'foo';
{
  var block = 'block';
}
function a() {
  var bar = 'bar';
  console.log(foo); // foo
  console.log(block); // block
}
a();
console.log(bar); // Uncaught ReferenceError: bar is not defined
```

### ES6

ES6 引入了 `let`,`const` 关键字的同时，引入了词法环境和局部作用域的概念，每一个使用了上面两个关键字的**代码块**都是一个独立的作用域，其子代码块也会成为独立的作用域：

- 每一个代码块都是独立作用域：

  ```javascript
  {
    let foo = 'foo';
  }
  console.log(foo); // Uncaught ReferenceError: foo is not defined
  ```

- 在同一个作用域内不能重复声明变量：

  ```javascript
  {
    let foo = 'foo';
    let foo = 'new foo'; // Uncaught SyntaxError: Identifier 'foo' has already been declared
    var foo = 'new foo'; // Uncaught SyntaxError: Identifier 'foo' has already been declared
  }
  ```

- for 循环：

  每一次循环都可以看成是一个嵌套了一层的独立的作用域

  ```javascript
  for (let i = 1; i <= 5; i++) {
    // for 语句括号内是一个作用域，循环体是该作用域的子作用域
    let j = i * 10;
    console.log(i, j);
  }
  ```

  上面代码第一次循环会有一个类似下面代码块的作用域，以此类推

  ```javascript
  {
    let i = 1;
    {
      let j = 10;
    }
  }
  ```

## 闭包

当前作用域引用了上级作用域的变量，就会形成闭包

下面代码就形成了闭包：

```javascript
function foo() {
  var count = 0;
  return function bar() {
    console.log(++count);
  };
}
```

并且每个闭包都是独立的：

```javascript
foo()(); // 1
foo()(); // 1
```

早期我们经常用这种特性来避免全局变量的污染，用来封装模块：

```javascript
function module() {
  var foo = 'foo';
  function getFoo() {
    return foo;
  }
  function setFoo(v) {
    foo = v;
  }
  return {
    getFoo,
    setFoo,
  };
}
var moduleA = module();
var moduleB = module();
moduleB.setFoo('bar');
moduleA.getFoo(); // foo
moduleB.getFoo(); // bar
```

### ES5

上一节的循环经常会有一个经典的问题，执行下面代码，控制台会打印出什么：

```javascript
for (var i = 1; i <= 5; i++) {
  setTimeout(() => console.log(i), 0);
}
```

答案是**五个** `6`

该结果是 ES5 作用域和 js 的执行机制（宏任务、微任务）造成的

`setTimeout` 的回调会在当前主线程的宏任务执行完后，才去执行

所以出循环后，此时 `i = 6`，马上执行了回调

因为 ES5 没有局部作用域和词法环境，回调会直接去上级作用域中拿变量，拿到的自然就是 `6` 了

### ES6

如果引入了词法环境，那就不同了

```javascript
for (let i = 1; i <= 5; i++) {
  setTimeout(() => console.log(i), 0);
}
```

上面代码的结果是：

```shell
1
2
3
4
5
```

上一节最后说了每一次都会是一个独立的作用域，这个只是个通俗的解释，通俗解释的代码：

```javascript
// 第一次循环
{
  let i = 1; // 第二次就是 2，以此类推
  {
    console.log(i);
  }
}
```

其实外部的作用域是不存在的

会保存每次结果是因为 ES6 的词法环境会记录下当前闭包中引入外部的变量

每一次循环都记录下了会使用到的外部变量，自然就会输出正确的结果了
