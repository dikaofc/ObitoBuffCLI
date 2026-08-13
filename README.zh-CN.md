# Obitobuff

[English](./README.md) | 简体中文

**本地优先的 AI 编程智能体。** Obitobuff 完全运行在你自己的 OpenAI 兼容端点（Ollama、OmniRoute、9Route、OpenRouter、LM Studio、vLLM 等）之上，通过 `obitobuff.config.json` 配置——没有 Obitobuff 后端、没有登录、没有会话、没有广告，也不调用任何 Obitobuff API。

## 选择适合你的 Obitobuff

| 产品                         | 功能                         | 开始使用                                                        |
| ---------------------------- | ---------------------------- | --------------------------------------------------------------- |
| **Obitobuff Desktop**（Beta） | 在本地并行运行多个智能体     | [下载 macOS、Windows 或 Linux 版](https://obitobuff.com/desktop) |
| **Obitobuff CLI**             | 本地优先的终端编程（自带模型/API 密钥） | [安装 CLI](https://obitobuff.com/cli)                            |
| **Obitobuff Web**             | 构建和发布全栈应用           | [构建应用](https://obitobuff.com/web)                            |
| **Obitobuff Cloud**           | 在任意 GitHub 仓库运行智能体 | [连接仓库](https://obitobuff.com/cloud)                          |
| **Obitobuff Chat**            | 使用 AI 进行研究和思考       | [开始对话](https://obitobuff.com/chat)                           |

> 注意：上表是 obitobuff.com 的产品套件（Desktop、Web、Cloud、Chat 等）。**本仓库只包含 Obitobuff CLI，且它是本地优先的**——其他产品与本仓库无关。

## 快速开始

在任意项目中从终端运行 Obitobuff（先在项目里创建 `obitobuff.config.json`，见下文「模型」一节）：

```bash
npm install -g obitobuff
cd ~/my-project
# 创建 obitobuff.config.json（至少一个 provider + model）
obitobuff
```

然后描述你想完成的任务。Obitobuff 会找到相关文件、进行修改，并运行适合该项目的检查。

## 模型

Obitobuff 不附带任何内置模型目录。所有模型都来自你自己的 `obitobuff.config.json`（或 `config.json`），每个 provider 指向你自己的 OpenAI 兼容端点：

```json
{
  "defaultModel": "deepseek/deepseek-v4-flash",
  "providers": {
    "openrouter": {
      "baseUrl": "https://openrouter.ai/api/v1",
      "api": "openai-completions",
      "apiKey": "sk-${OPENROUTER_API_KEY}",
      "models": [{ "id": "deepseek/deepseek-v4-flash" }]
    }
  }
}
```

- 根智能体与所有子智能体的请求都路由到你配置的 provider。
- 用 `/model` 列出或切换模型，用 `--model <id>` 在启动时选择。
- 没有配置任何 provider 时，CLI 会拒绝启动并提示如何创建配置。

## Obitobuff 的工作原理

Obitobuff 使用专业化智能体，而不是把所有任务都交给同一个模型和同一条提示词。根据任务需要，智能体会收集上下文、制定计划、编辑或研究、运行工具并审查结果。

- **代码库上下文** —— 文件查找智能体会在编辑前定位项目中的相关部分。
- **实现与审查** —— 智能体可以拆分工作、修改文件、运行命令并检查结果。
- **研究与浏览器操作** —— 智能体可以查阅文档，并在真实浏览器中测试应用。
- **本地并行工作** —— Desktop 会将并发智能体隔离在各自的工作区中。
- **托管环境** —— Web 和 Cloud 提供沙箱、预览、终端和部署工作流。

## 无需账户

Obitobuff 是本地优先的：没有托管后端，没有登录系统，没有会话，没有广告。你的请求只发往你在 `obitobuff.config.json` 里配置的 provider——计费、限额与隐私完全取决于你自己选择的提供商。

## 数据使用与隐私

**我的数据会用于训练 AI 吗？** 这取决于你配置的 provider——Obitobuff 本身不收集、存储或分析你的数据。

**我的数据会如何使用和存储？** 你的提示词、代码和文件只会发送给你在 `obitobuff.config.json` 里配置的 provider。Obitobuff 是本地优先的，没有托管后端，也不包含任何遥测。

## 参与贡献

Obitobuff 是一个使用 Bun 构建的 TypeScript monorepo。欢迎为产品、智能体、工具、文档和底层运行时贡献代码。

```bash
git clone https://github.com/dikaofc/ObitoBuffCLI.git
cd ObitoBuffCLI
bun install
```

单独启动 CLI：

```bash
bun run dev:obitobuff
```

环境配置及提交拉取请求前应运行的检查，请参阅[贡献指南](./CONTRIBUTING.md)、[开发指南](./docs/development.md)和[测试指南](./docs/testing.md)。

## 基于 Codebuff 构建

Obitobuff 基于开放的多智能体框架 [Codebuff](https://codebuff.com) 构建，其编排、工具和 SDK 均由 Codebuff 提供。若要创建自定义智能体或将其嵌入其他应用，请参阅 [Codebuff 文档](https://codebuff.com/docs)和 [`@codebuff/sdk`](https://www.npmjs.com/package/@codebuff/sdk)。

## 链接

- [官网](https://obitobuff.com)
- [GitHub](https://github.com/dikaofc/ObitoBuffCLI)
- [Releases](https://github.com/dikaofc/ObitoBuffCLI/releases)
- [许可证](./LICENSE)
