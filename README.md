![图标](icon/logo-new.png)

![License](https://img.shields.io/badge/Github-Kiyuu-lightblue?style=flat-square)   ![License](https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square) 

# Mio Core
Mio Core是Mio Minecraft Launcher的集成核心库，使用TypeScript和C++编写，跨平台，开箱即用！Mio Core提供超多工具和方法类，包括安装、启动游戏，文件检查，版本扫描，系统交互以及第三方API服务等功能。

您可以在Nodejs 16+的环境中使用Mio Core，也可以在如Electron等桌面应用开发工具中使用。如果您在使用期间遇到了问题，也欢迎您在这里发Issues。

> [!IMPORTANT]
> 本项目是[MMLib](https://github.com/kiyonya/mmlib)的重构，添加大量新内容！（想知道这个库的由来可以去看Readme）

> [!IMPORTANT]
> 目前Mio Core仍处于早期开发阶段，修改较为频繁，目前已经基本支持Linux和Windows平台的安装和启动！

## Features
- 安装所有游戏版本，切换镜像安装
- 高速稳定的下载速度
- 超快速的启动速度
- 支持安装Legacy Forge、Forge、Fabric、NeoForge、Quilt 等主流模组加载器
- 支持通过文件或者URL安装整合包
- 支持综合搜索Modrinth Curseforge平台资源
- 支持导出Modrinth整合包
- 扫描版本文件
- 扫描版本信息
- 自动Java运行时安装获取
- 游戏文件检查
- 管理版本模组，资源包，截图和光影
- 支持版本隔离
- 支持安装服务端

## 依赖

- [Axios](https://github.com/axios/axios)  ![License](https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square) 

- [Adm Zip](https://github.com/cthackers/adm-zip)  ![License](https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square) 

- [Node Download Helper](https://github.com/hgouveia/node-downloader-helper)  ![License](https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square) 

- [p-Limit](https://github.com/sindresorhus/p-limit)  ![License](https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square) 

- [node-tar](https://github.com/isaacs/node-tar)  ![License](https://img.shields.io/badge/License-BlueOak1.0.0-orange?style=flat-square) 

- [JSdom](https://github.com/jsdom/jsdom#readme)  ![License](https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square) 

- [Compare Versions](https://github.com/omichelsen/compare-versions#readme)  ![License](https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square) 

- [iconv-lite](https://github.com/pillarjs/iconv-lite)  ![License](https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square) 

- [toml-node](https://github.com/BinaryMuse/toml-node#readme)  ![License](https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square) 


## 协议
Mio Core基于 **MIT** 协议开源，查看License文件获取更多信息

如果这些代码对您有帮助就太好了，感谢您看到这里(●´ω｀●)ゞ