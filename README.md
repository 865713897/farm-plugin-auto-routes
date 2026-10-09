<div align="center">
  <img src="./assets/logo.png" />

  <h1>farm-plugin-auto-routes</h1>

  <p>
    基于文件系统自动生成 React Router / Vue Router 路由的 Farm / Vite 插件
  </p>

  <p>
    <a href="https://github.com/farm-fe/farm">
      <img src="https://img.shields.io/badge/Farm-%3E%3D1.0.1-blue" alt="Farm" />
    </a>
    <a href="https://vitejs.dev/">
      <img src="https://img.shields.io/badge/Vite-%3E%3D6.0.0-646CFF" alt="Vite" />
    </a>
    <a href="https://www.npmjs.com/package/farm-plugin-auto-routes">
      <img src="https://img.shields.io/npm/v/farm-plugin-auto-routes" alt="npm version" />
    </a>
    <a href="https://github.com/865713897/farm-plugin-auto-routes/blob/master/LICENSE">
      <img src="https://img.shields.io/github/license/865713897/farm-plugin-auto-routes" alt="license" />
    </a>
  </p>
</div>

---

## ⚠️ 注意

以下介绍示例以React为主，其他框架同理，只是文件后缀名不同，例如Vue则查找 `*.vue`。

---

## ✨ 介绍

`farm-plugin-auto-routes` 是一个基于**文件系统约定**自动生成路由配置的 Farm / Vite 插件。

你只需要按照约定创建页面文件和目录：

```text
src/
├── pages/
│   ├── index.tsx
│   ├── about.tsx
│   └── user/
│       ├── index.tsx
│       └── $id.tsx
└── layouts/
    └── index.tsx
```

插件会根据文件结构自动生成路由：

```text
/
├── /about
└── /user
    └── /user/:id
```

不再需要手动维护：

```ts
const routes = [
  {
    path: '/',
    Component: Home,
    children: [
      // ...
    ],
  },
];
```

插件会自动完成：

- 页面文件扫描
- 动态路由转换
- Index 路由处理
- Layout 路由识别
- 父子路由关系建立
- 路由 Metadata 解析
- React / Vue 路由代码生成
- Virtual Module 注入
- 文件变化后的路由重新生成

---

## ✨ 特性

- 📁 **文件系统路由**
  - 根据页面文件路径自动生成路由
  - 无需手动维护 routes 配置

- ⚛️ **React Router 支持**
  - 支持 React Router Legacy API
  - 支持 React Router Modern API
  - 通过 `routerApiVersion` 选择生成方式

- 🟢 **Vue Router 支持**
  - 基于相同的文件系统路由思想生成 Vue 路由

- 🧩 **Layout 支持**
  - 全局 Layout
  - 局部 Layout
  - Layout 自动建立父子路由关系

- 🔀 **动态路由**
  - `$id.tsx` 自动转换为 `:id`

- 📝 **路由 Metadata**
  - 可以直接通过页面文件顶部注释定义 route id、parentId 和自定义 meta

- 📂 **多页面目录**
  - 支持同时配置多个页面目录

- 🔍 **文件过滤**
  - 支持 `pattern` 对扫描文件进行过滤

- 💾 **Virtual Module**
  - 默认在内存中生成路由
  - 可以通过 `writeToDisk` 查看实际生成代码

- ⚡ **Farm / Vite**
  - 可以用于 Farm 项目
  - 也可以用于 Vite 项目

---

# 📦 安装

使用 npm：

```bash
npm install farm-plugin-auto-routes --save-dev
```

使用 pnpm：

```bash
pnpm add farm-plugin-auto-routes -D
```

使用 yarn：

```bash
yarn add farm-plugin-auto-routes -D
```

---

# 🚀 快速开始

## 1. 创建页面目录

默认情况下，插件会扫描：

```text
src/pages
```

例如：

```text
src/
├── pages/
│   ├── index.tsx
│   ├── about.tsx
│   └── user/
│       ├── index.tsx
│       └── $id.tsx
│
└── layouts/
    └── index.tsx
```

---

## 2. 配置 Farm

在 `farm.config.ts` 中：

```ts
import { defineConfig } from '@farmfe/core';
import farmPluginAutoRoutes from 'farm-plugin-auto-routes';

export default defineConfig({
  plugins: [
    farmPluginAutoRoutes({
      framework: 'react',
    }),
  ],
});
```

---

## 3. 配置 Vite

如果项目使用 Vite：

```ts
import { defineConfig } from 'vite';
import farmPluginAutoRoutes from 'farm-plugin-auto-routes';

export default defineConfig({
  plugins: [
    farmPluginAutoRoutes({
      framework: 'react',
    }),
  ],
});
```

插件会根据当前构建环境自动适配 Farm / Vite。

如果没有显式配置 `framework`，插件会尝试从项目的 `package.json` 中检测当前使用的框架。

---

# 🗂️ 文件系统路由

插件的核心思想是：

> **文件路径决定 URL，目录关系决定 Route 层级。**

例如：

```text
src/pages/
├── index.tsx
├── about.tsx
└── user/
    ├── index.tsx
    ├── profile.tsx
    └── $id.tsx
```

会得到类似：

```text
/
├── /about
└── /user
    ├── /user/profile
    └── /user/:id
```

---

# 📌 Index 页面

目录中的 `index` 文件表示当前目录的首页。

例如：

```text
pages/
├── index.tsx
└── user/
    └── index.tsx
```

对应：

```text
/
└── /user
```

也就是说：

```text
pages/user/index.tsx
```

不会生成：

```text
/user/index
```

而是：

```text
/user
```

---

# 🔀 动态路由

以 `$` 开头的文件名会转换为动态参数。

例如：

```text
pages/
└── user/
    └── $id.tsx
```

生成：

```text
/user/:id
```

对应 React Router：

```tsx
<Route path="/user/:id" />
```

页面中可以通过 React Router 获取参数：

```tsx
import { useParams } from 'react-router-dom';

export default function UserPage() {
  const { id } = useParams();

  return <div>User ID: {id}</div>;
}
```

---

# 🧩 Layout

Layout 是本插件中的一个重要概念。

插件支持两种 Layout：

1. 全局 Layout
2. 局部 Layout

---

## 全局 Layout

默认：

```text
src/layouts/index.tsx
```

会被识别为全局 Layout。

例如：

```text
src/
├── layouts/
│   └── index.tsx
└── pages/
    ├── index.tsx
    ├── about.tsx
    └── user/
        └── index.tsx
```

最终结构类似：

```text
GlobalLayout
├── /
├── /about
└── /user
```

全局 Layout 会作为没有更具体 Layout 时的默认父级。

---

## 局部 Layout

在页面目录中创建：

```text
Layout.tsx
```

例如：

```text
pages/
└── user/
    ├── Layout.tsx
    ├── index.tsx
    ├── profile.tsx
    └── $id.tsx
```

插件会将：

```text
user/Layout.tsx
```

识别为 `user` 目录对应的 Layout。

最终结构：

```text
UserLayout
├── /user
├── /user/profile
└── /user/:id
```

局部 Layout 的优先级高于全局 Layout。

也就是说：

```text
局部 Layout > 全局 Layout
```

---

# 🧠 Layout 的作用

Layout 不只是一个普通组件。

在生成的路由结构中，它同时承担：

```text
UI Layout
+
Route Parent
+
Route Configuration Boundary
```

因此可以在 Layout 中处理：

- 页面公共 UI
- `<Outlet />`
- 登录权限
- loader
- action
- ErrorBoundary
- 公共 route metadata

例如：

```tsx
import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div>
      <header>Header</header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
```

---

# ⚛️ React Router API 版本

React Router 不同版本的数据路由 API 存在差异。

因此 React 模式下提供：

```ts
routerApiVersion: 'legacy' | 'modern';
```

用于决定生成哪一种路由加载方式。

---

## `legacy`

配置：

```ts
farmPluginAutoRoutes({
  framework: 'react',

  react: {
    routerApiVersion: 'legacy',
  },
});
```

Legacy 模式使用：

```tsx
React.lazy(() => import('./pages/Home'));
```

生成的路由结构类似：

```ts
{
  path: '/',
  Component: React.lazy(() => import('./pages/Home')),
}
```

这种方式适合：

- 只需要组件懒加载
- 项目没有使用 React Router 的 route module `lazy`
- 需要兼容较早版本的 React Router

---

## `modern`

配置：

```ts
farmPluginAutoRoutes({
  framework: 'react',

  react: {
    routerApiVersion: 'modern',
  },
});
```

Modern 模式使用 React Router 的 route-level `lazy` API。

概念上生成：

```ts
{
  path: '/',

  lazy: async () => {
    const mod = await import('./pages/Home');

    return {
      Component: mod.default,
      loader: mod.loader,
      action: mod.action,
      ErrorBoundary: mod.ErrorBoundary,
      handle: mod.handle,
      shouldRevalidate: mod.shouldRevalidate,
    };
  },
}
```

这样页面模块不仅可以提供组件，还可以提供 React Router Route Module 能力：

```tsx
export default function Page() {
  return <div>Hello</div>;
}

export async function loader() {
  // ...
}

export async function action() {
  // ...
}

export function ErrorBoundary() {
  // ...
}

export const handle = {
  // ...
};
```

因此 Modern 模式更适合使用 React Router Data APIs 的项目。

---

## Legacy 和 Modern 如何选择？

简单来说：

| 配置     | 推荐场景                                   |
| -------- | ------------------------------------------ |
| `legacy` | 只需要 `React.lazy` 组件懒加载             |
| `modern` | 使用 React Router Data APIs / route module |
| `legacy` | 老项目、兼容性优先                         |
| `modern` | 新项目、React Router Data Router           |

如果你的页面需要：

```text
loader
action
ErrorBoundary
handle
shouldRevalidate
```

推荐使用：

```ts
react: {
  routerApiVersion: 'modern',
}
```

---

# 🧱 React 页面模块

一个普通页面：

```tsx
export default function Home() {
  return <div>Home</div>;
}
```

Modern 模式下还可以：

```tsx
export default function User() {
  return <div>User</div>;
}

export async function loader() {
  return {
    user: 'Tom',
  };
}

export async function action() {
  // ...
}

export function ErrorBoundary() {
  return <div>Something went wrong</div>;
}
```

插件会将这些 Route Module API 一起交给 React Router。

---

# 📝 路由 Metadata

除了根据文件路径生成路由，还可以通过文件顶部注释定义路由信息。

例如：

```tsx
// route-id: user-list
// route-meta: { "title": "用户列表" }
// route-parent-id: user-layout

export default function UserList() {
  return <div>User List</div>;
}
```

---

## `route-id`

用于自定义 route id：

```tsx
// route-id: user-list
```

如果没有配置，插件会根据文件路径自动生成。

---

## `route-parent-id`

可以手动指定父级 Route：

```tsx
// route-parent-id: user-layout
```

如果没有手动指定，插件会根据 Layout 和目录结构自动建立父子关系，如果为null，则该路由不会被父级路由包含。

---

## `route-meta`

可以存放自定义路由信息：

```tsx
// route-meta: { "title": "用户列表", "auth": true }
```

生成：

```ts
{
  path: '/user',
  meta: {
    title: '用户列表',
    auth: true,
  },
}
```

你可以利用这些信息实现：

- 页面标题
- 权限标识
- 菜单配置
- Breadcrumb
- 页面缓存配置
- 自定义路由标记

---

# 📂 多目录配置

`dirs` 可以配置多个页面目录。

例如：

```ts
farmPluginAutoRoutes({
  framework: 'react',

  dirs: ['src/pages', 'src/admin-pages'],
});
```

插件会分别扫描：

```text
src/pages
src/admin-pages
```

并生成统一的路由配置。

---

# 🛠️ RouteDirectory

除了字符串，还可以使用对象配置目录：

```ts
farmPluginAutoRoutes({
  dirs: [
    {
      dir: 'src/pages',
      basePath: '',
    },
    {
      dir: 'src/admin-pages',
      basePath: '/admin',
    },
  ],
});
```

类型：

```ts
interface RouteDirectory {
  dir: string;

  /**
   * 生成路由时追加的基础路径
   */
  basePath?: string;

  /**
   * 文件过滤规则
   */
  pattern?: string | RegExp;

  /**
   * 是否作为全局 Layout 目录处理
   */
  isGlobal?: boolean;
}
```

---

# 🔍 pattern

可以使用 `pattern` 过滤需要参与路由生成的文件。

例如：

```ts
farmPluginAutoRoutes({
  dirs: [
    {
      dir: 'src/pages',
      pattern: '\\.tsx$',
    },
  ],
});
```

也可以直接传：

```ts
farmPluginAutoRoutes({
  dirs: [
    {
      dir: 'src/pages',
      pattern: /\.tsx$/,
    },
  ],
});
```

这样只有符合规则的文件会参与路由生成。

---

# 💾 writeToDisk

默认情况下，插件只通过 Virtual Module 在内存中生成路由。

```ts
farmPluginAutoRoutes({
  writeToDisk: false,
});
```

如果你希望查看插件最终生成的代码，可以：

```ts
farmPluginAutoRoutes({
  writeToDisk: true,
});
```

插件会把生成结果写入项目的 `node_modules` 目录。

这样非常适合：

- 调试路由
- 查看最终生成结果
- 排查路径问题
- 理解插件内部行为

---

# 🔌 Virtual Module

插件会提供：

```ts
virtual: routes;
```

页面中可以：

```ts
import routes from 'virtual:routes';
```

然后将它交给你的 Router。

例如 React Router：

```tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import routes from 'virtual:routes';

const router = createBrowserRouter(routes);

export default function App() {
  return <RouterProvider router={router} />;
}
```

插件生成的 `routes` 本质上就是一个 React Router / Vue Router 可以消费的 Route Object 数组。

---

# 🔎 查看生成的 Route

开发过程中如果你想知道插件到底生成了什么：

```ts
farmPluginAutoRoutes({
  writeToDisk: true,
});
```

然后查看生成文件。

推荐在遇到以下问题时开启：

```text
页面访问 404
Layout 没有生效
动态路由不正确
父子路由关系不正确
Meta 没有生成
```

---

# 📁 完整示例

一个比较完整的 React 项目可以这样组织：

```text
src/
├── layouts/
│   └── index.tsx
│
├── pages/
│   ├── index.tsx
│   ├── about.tsx
│   │
│   ├── user/
│   │   ├── Layout.tsx
│   │   ├── index.tsx
│   │   ├── profile.tsx
│   │   └── $id.tsx
│   │
│   └── admin/
│       ├── Layout.tsx
│       ├── index.tsx
│       └── settings.tsx
│
└── App.tsx
```

配置：

```ts
import { defineConfig } from 'vite';
import farmPluginAutoRoutes from 'farm-plugin-auto-routes';

export default defineConfig({
  plugins: [
    farmPluginAutoRoutes({
      framework: 'react',

      react: {
        routerApiVersion: 'modern',
      },

      dirs: 'src/pages',

      writeToDisk: false,
    }),
  ],
});
```

使用：

```tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import routes from 'virtual:routes';

const router = createBrowserRouter(routes);

export default function App() {
  return <RouterProvider router={router} />;
}
```

---

# 🧭 一个完整的路由生成过程

插件内部大致按照下面的流程工作：

```text
                    文件系统
                       │
                       ▼
                 扫描 pages 目录
                       │
                       ▼
                  识别页面文件
                       │
             ┌─────────┼─────────┐
             │         │         │
             ▼         ▼         ▼
           Page       Layout    $id
             │         │         │
             │         │         ▼
             │         │       :id
             │         │
             │         ▼
             │      Parent Route
             │
             ▼
        Route Metadata
             │
             ▼
        建立父子关系
             │
             ▼
       React / Vue Resolver
             │
             ▼
        Route Object Array
             │
             ▼
        virtual:routes
             │
             ▼
       React Router / Vue Router
```

---

# ❓ 常见问题

## 为什么我的页面没有生成？

检查：

1. 页面是否位于 `dirs` 配置的目录中
2. 文件后缀是否被当前 framework 支持
3. 是否被 `pattern` 排除
4. 是否属于插件默认忽略的文件
5. 是否配置了错误的 `framework`

可以暂时开启：

```ts
writeToDisk: true;
```

查看最终生成结果。

---

## 为什么 Layout 没有生效？

检查 Layout 文件名。

全局 Layout：

```text
src/layouts/index.tsx
```

局部 Layout：

```text
src/pages/user/Layout.tsx
```

注意：

```text
Layout.tsx
```

是插件约定的 Layout 文件名。

---

## 为什么 `$id.tsx` 没有生成动态路由？

确认文件：

```text
$id.tsx
```

而不是：

```text
id.tsx
```

插件会将：

```text
$id
```

转换成：

```text
:id
```

---

## `routerApiVersion` 应该怎么配置？

如果只是希望页面组件懒加载：

```ts
react: {
  routerApiVersion: 'legacy',
}
```

如果项目使用 React Router Data APIs：

```ts
react: {
  routerApiVersion: 'modern',
}
```

Modern 模式适合需要：

```text
loader
action
ErrorBoundary
handle
shouldRevalidate
```

等 Route Module 能力的项目。

---

# ⚠️ React Router 版本说明

`routerApiVersion` 解决的是**路由加载 API 形式的差异**，而不是简单地按照某一个具体版本号进行判断。

### Legacy

使用：

```ts
React.lazy(() => import(...))
```

主要关注：

```text
Route Component
```

### Modern

使用：

```ts
route.lazy;
```

主要关注：

```text
Route Module
├── Component
├── loader
├── action
├── ErrorBoundary
├── handle
└── shouldRevalidate
```

因此：

```ts
routerApiVersion: 'legacy';
```

适合兼容性优先的项目。

```ts
routerApiVersion: 'modern';
```

适合基于 React Router Data Router / Route Module 能力构建的新项目。

> 注意：具体 React Router 版本与 API 支持情况，请以你项目实际安装的 `react-router` / `react-router-dom` 版本对应的官方文档为准。

---

# 🔧 配置参考

```ts
interface AutoRoutesOptions {
  /**
   * 页面目录
   */
  dirs?: RouteDirectory[];

  /**
   * 是否将生成的 Virtual Module 写入磁盘
   */
  writeToDisk?: boolean;

  /**
   * 使用的路由框架
   */
  framework?: 'react' | 'vue';

  /**
   * React Router 配置
   */
  react?: {
    /**
     * React Router API 模式
     */
    routerApiVersion: 'legacy' | 'modern';
  };

  /**
   * Vue Router 配置
   */
  vue?: {};
}
```

---

# 🏗️ 设计理念

这个插件遵循：

> **Convention over Configuration**

尽可能让：

```text
文件结构
```

成为：

```text
路由配置
```

同时保留必要的配置能力：

```text
文件系统约定
        +
Layout
        +
动态路由
        +
Route Metadata
        +
Framework Resolver
        +
Virtual Module
```

这样既可以快速开发，也可以在大型项目中保留足够的扩展能力。

---

# 📌 Roadmap

- [x] Farm 支持
- [x] Vite 支持
- [x] 文件系统路由
- [x] 动态路由
- [x] 全局 Layout
- [x] 局部 Layout
- [x] Route Metadata
- [x] 多目录
- [x] Virtual Module
- [x] React Router Legacy API
- [x] React Router Modern API
- [ ] Vue Router 完整能力
- [ ] 更丰富的路由约定
- [ ] 更完善的路由类型生成

---

# 📄 License

[MIT](./LICENSE)
