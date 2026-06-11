import { AgentRecord } from "../storage/agent-store";

export interface WorkflowContext {
  input: {
    audio: string;
  };

  agent?: AgentRecord;

  transcript?: string;
  knowledgeContext?: string;

  llmResponse?: string;

  audioOutput?: Buffer;
  audioOutputPath?: string;
}