import { prisma } from "../db/prisma";

export interface KnowledgeRecord {
  id: string;
  agentId: string;
  fileName: string;
  filePath: string;
  textPath: string;
  createdAt: string | Date;
}

export class KnowledgeStore {
  async save(record: KnowledgeRecord) {
    return prisma.knowledge.create({
      data: {
        id: record.id,
        agentId: record.agentId,
        fileName: record.fileName,
        filePath: record.filePath,
        textPath: record.textPath,
      },
    });
  }

  async findByAgentId(agentId: string) {
    return prisma.knowledge.findMany({
      where: { agentId },
      orderBy: { createdAt: "desc" },
    });
  }

  async list(agentId: string) {
    return this.findByAgentId(agentId);
  }
}