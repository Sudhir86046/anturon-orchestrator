import { WorkflowRunner } from "../workflows/workflow-runner";
import { STTStep } from "../workflows/steps/stt-step";
import { KnowledgeStep } from "../workflows/steps/knowledge-step";
import { LLMStep } from "../workflows/steps/llm-step";
import { TTSStep } from "../workflows/steps/tts-step";
import { defaultAgent } from "../agents/agent-config";
import { AgentRecord } from "../storage/agent-store";

export class Orchestrator {
  async execute(input: any, agent?: AgentRecord) {
    const runner = new WorkflowRunner();

    return runner.run(
      [
        new STTStep(),
        new KnowledgeStep(),
        new LLMStep(),
        new TTSStep(),
      ],
      {
        input,
        agent: agent || defaultAgent,
      }
    );
  }
}