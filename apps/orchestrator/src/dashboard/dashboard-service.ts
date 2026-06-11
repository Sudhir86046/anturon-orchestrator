import { prisma } from "../db/prisma";

export class DashboardService {
  async getStats() {
    const [
      totalAgents,
      totalCalls,
      completedCalls,
      failedCalls,
      totalCampaigns,
      runningCampaigns,
      completedCampaigns,
      totalKnowledgeDocs,
    ] = await Promise.all([
      prisma.agent.count(),
      prisma.call.count(),
      prisma.call.count({ where: { status: "completed" } }),
      prisma.call.count({ where: { status: "failed" } }),
      prisma.campaign.count(),
      prisma.campaign.count({ where: { status: "running" } }),
      prisma.campaign.count({ where: { status: "completed" } }),
      prisma.knowledge.count(),
    ]);

    return {
      totalAgents,
      totalCalls,
      completedCalls,
      failedCalls,
      totalCampaigns,
      runningCampaigns,
      completedCampaigns,
      totalKnowledgeDocs,
    };
  }

  async getRecentCalls() {
    return prisma.call.findMany({
      take: 10,
      orderBy: {
        startedAt: "desc",
      },
    });
  }

  async getRecentAgents() {
    return prisma.agent.findMany({
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getRecentCampaigns() {
    return prisma.campaign.findMany({
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}