import { AgentStore, AgentRecord } from "../storage/agent-store";

const store = new AgentStore();

export class AgentService {
  async create(data: {
    name: string;
    systemPrompt: string;
    language?: string;
  }): Promise<AgentRecord> {
    const agent: AgentRecord = {
      id: `agent_${Date.now()}`,
      name: data.name,
      systemPrompt: data.systemPrompt,
      language: data.language || "en",
      sttProvider: "deepgram",
      llmProvider: "sarvam",
      ttsProvider: "deepgram",
      createdAt: new Date(),
    };

    return await store.save(agent);
  }

  async list() {
    return await store.list();
  }

  async findById(id: string) {
    return await store.findById(id);
  }
}