---
name: autogen-agent-builder
description: >
  Build AI agents and multi-agent workflows using the AutoGen framework.
  Use when: creating single agents, multi-agent teams, using MCP servers,
  configuring model clients, setting up group chats (round-robin, selector,
  swarm, graph), using AgentTool for orchestration, building with AutoGen
  Studio, or working with code executors. Triggers on: agent creation,
  multi-agent, team, group chat, MCP, model client, AssistantAgent,
  orchestration, workflow.
---

# AutoGen Agent Builder

Build single agents or multi-agent workflows using AutoGen's layered API.

## Decision Tree
- **Single agent task** → Use `AssistantAgent` directly
- **Agent calling other agents** → Use `AgentTool` wrapper
- **Sequential pipeline** → `RoundRobinGroupChat`
- **Dynamic routing by content** → `SelectorGroupChat`
- **Handoff-based flow** → `Swarm`
- **Complex DAG** → `GraphFlow` (experimental in `_graph/`)
- **No-code prototype** → AutoGen Studio (`autogenstudio ui`)

## Quick Start: Single Agent
```python
import asyncio
from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient

async def main() -> None:
    client = OpenAIChatCompletionClient(model="gpt-4.1")
    agent = AssistantAgent("assistant", model_client=client)
    print(await agent.run(task="Say hello"))
    await client.close()

asyncio.run(main())
```

## Agent Types (autogen_agentchat.agents)
- `AssistantAgent` - LLM-powered agent with tool support
- `CodeExecutorAgent` - Executes code blocks from messages
- `UserProxyAgent` - Proxies to human user for input
- `SocietyOfMindAgent` - Wraps a team as a single agent
- `MessageFilterAgent` - Filters messages before passing to inner agent

## Multi-Agent with AgentTool
Wrap any agent as a tool for another agent:
```python
from autogen_agentchat.tools import AgentTool

math_agent = AssistantAgent("math", model_client=client, system_message="Math expert.")
math_tool = AgentTool(math_agent, return_value_as_last_message=True)

orchestrator = AssistantAgent("main", model_client=client, tools=[math_tool])
```

## Team Types (autogen_agentchat.teams)
- `RoundRobinGroupChat` - Agents take turns sequentially
- `SelectorGroupChat` - LLM selects next speaker based on context
- `Swarm` - Agents use handoff tools to transfer control
- Graph-based flows in `teams/_group_chat/_graph/`

## MCP Server Integration
```python
from autogen_ext.tools.mcp import McpWorkbench, StdioServerParams

params = StdioServerParams(command="npx", args=["@playwright/mcp@latest", "--headless"])
async with McpWorkbench(params) as mcp:
    agent = AssistantAgent("browser", model_client=client, workbench=mcp)
```
Pass multiple MCP servers as a list to `workbench`.

## Termination Conditions (autogen_agentchat.conditions)
Control when teams stop: `MaxMessageTermination`, `TextMentionTermination`, `TokenUsageTermination`, `HandoffTermination`, etc.

## Extensions (autogen_ext)
- **Models**: `openai`, `replay` (testing)
- **Code executors**: Docker, local
- **Tools**: MCP, function tools
- **Memory**: various backends
- **Runtimes**: gRPC distributed
- **Teams**: Magentic-One

## AutoGen Studio
```bash
pip install -U autogenstudio
autogenstudio ui --port 8080 --appdir ./my-app
```
Prototype multi-agent workflows via browser at http://localhost:8080.

## Key Packages
```bash
pip install -U "autogen-agentchat" "autogen-ext[openai]"  # core + OpenAI
pip install -U "autogen-ext[docker]"                       # Docker code execution
pip install -U "autogen-ext[azure]"                        # Azure OpenAI
```
