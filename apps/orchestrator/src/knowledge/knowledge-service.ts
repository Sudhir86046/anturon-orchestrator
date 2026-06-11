import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { KnowledgeStore } from "./knowledge-store";
import { prisma } from "../db/prisma";

const store = new KnowledgeStore();

function chunkText(text: string, size = 700): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  const chunks: string[] = [];

  for (let i = 0; i < clean.length; i += size) {
    chunks.push(clean.slice(i, i + size));
  }

  return chunks.filter(Boolean);
}

export class KnowledgeService {
  async uploadKnowledge(params: {
    agentId: string;
    filePath: string;
    originalName: string;
  }) {
    const ext = path.extname(params.originalName).toLowerCase();

    let text = "";

    if (ext === ".pdf") {
      const buffer = fs.readFileSync(params.filePath);
      const result = await pdfParse(buffer);
      text = result.text;
    } else if (ext === ".docx") {
      const result = await mammoth.extractRawText({ path: params.filePath });
      text = result.value;
    } else if (ext === ".txt" || ext === ".md") {
      text = fs.readFileSync(params.filePath, "utf-8");
    } else {
      throw new Error("Only PDF, DOCX, TXT, and MD files are supported.");
    }

    if (!text.trim()) {
      throw new Error("No text could be extracted from this file.");
    }

    const knowledgeDir = path.resolve("./knowledge", params.agentId);
    fs.mkdirSync(knowledgeDir, { recursive: true });

    const safeFileName = params.originalName.replace(/[^a-zA-Z0-9.-]/g, "_");

    const textPath = path.join(
      knowledgeDir,
      `${Date.now()}-${safeFileName}.txt`
    );

    fs.writeFileSync(textPath, text);

    const record = await store.save({
      id: `kb_${Date.now()}`,
      agentId: params.agentId,
      fileName: params.originalName,
      filePath: params.filePath,
      textPath,
      createdAt: new Date(),
    });

    const chunks = chunkText(text);

    await prisma.knowledgeChunk.createMany({
      data: chunks.map((content, index) => ({
        id: `chunk_${Date.now()}_${index}`,
        knowledgeId: record.id,
        agentId: params.agentId,
        content,
        chunkIndex: index,
      })),
    });

    return {
      ...record,
      chunksCreated: chunks.length,
    };
  }

  async getAgentContext(agentId: string, query: string) {
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3);

    const chunks = await prisma.knowledgeChunk.findMany({
      where: { agentId },
      take: 100,
      orderBy: { createdAt: "desc" },
    });

    if (!chunks.length) return "";

    const scored = chunks
      .map((chunk) => {
        const content = chunk.content.toLowerCase();
        const score = words.reduce(
          (total, word) => total + (content.includes(word) ? 1 : 0),
          0
        );

        return {
          content: chunk.content,
          score,
        };
      })
      .sort((a, b) => b.score - a.score);

    const best = scored.filter((item) => item.score > 0).slice(0, 5);

    if (!best.length) {
      return scored.slice(0, 3).map((item) => item.content).join("\n\n");
    }

    return best.map((item) => item.content).join("\n\n");
  }

  async list(agentId: string) {
    return await store.list(agentId);
  }
}