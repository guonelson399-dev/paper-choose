# Paper Choose 新网页源码

视觉与交互来自作者提供的 Base44 源码。此目录与仓库根目录的 Python 后端共同工作；不是另一个独立的修改执行器。

## 本地构建

Node.js 22.12+（本轮使用 24.19.0），Python 3.10+。

```sh
npm ci
npm run build:local
python ../scripts/install_webapp.py
```

然后回到项目根目录，运行 `python -m paperchoose serve --open`。启动脚本不需要重新打补丁。

```sh
npm test
npm run lint
npm run typecheck
```

`npm test` 使用真实 React 组件、jsdom 和实际 Python HTTP 服务；云端 AI 与分批翻译返回使用明确的测试夹具，不调用云端、不消耗模型额度。实际 Argos 短稿验证另见发布状态。`typecheck` 是上游导出配置，目前有已记录的 JSX 类型错误，不能宣称全通过。

环境配置、云端函数与发布边界见 [部署说明](部署说明.md)。本 GitHub 仓库尚未核实与 Base44 Builder 自动同步；提交 GitHub 不等于部署 Base44。
