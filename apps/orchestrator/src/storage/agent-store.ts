import { prisma } from "../db/prisma";

export interface AgentRecord {
  id: string;
  name: string;
  systemPrompt: string;
  language: string;
  sttProvider: string;
  llmProvider: string;
  ttsProvider: string;
  createdAt: string | Date;
}

export class AgentStore {
  async save(agent: AgentRecord) {
    return prisma.agent.create({
      data: {
        id: agent.id,
        name: agent.name,
        systemPrompt: agent.systemPrompt,
        language: agent.language,
        sttProvider: agent.sttProvider,
        llmProvider: agent.llmProvider,
        ttsProvider: agent.ttsProvider,
      },
    });
  }

  async list() {
    return prisma.agent.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findById(id: string) {
    return prisma.agent.findUnique({
      where: {
        id,
      },
    });
  }
}