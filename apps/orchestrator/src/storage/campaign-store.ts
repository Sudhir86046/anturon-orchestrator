import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { Campaign, CampaignLead } from "../campaigns/campaign-types";

export class CampaignStore {
  async save(campaign: Campaign) {
    return prisma.campaign.create({
      data: {
        id: campaign.id,
        name: campaign.name,
        agentId: campaign.agentId,
        csvPath: campaign.csvPath,
        totalContacts: campaign.totalContacts,
        completedCalls: campaign.completedCalls,
        failedCalls: campaign.failedCalls,
        status: campaign.status,
        leads: campaign.leads as unknown as Prisma.InputJsonValue,
        startedAt: campaign.startedAt ? new Date(campaign.startedAt) : null,
        completedAt: campaign.completedAt
          ? new Date(campaign.completedAt)
          : null,
      },
    });
  }

  async update(campaign: Campaign) {
    return prisma.campaign.update({
      where: {
        id: campaign.id,
      },
      data: {
        completedCalls: campaign.completedCalls,
        failedCalls: campaign.failedCalls,
        status: campaign.status,
        leads: campaign.leads as unknown as Prisma.InputJsonValue,
        startedAt: campaign.startedAt ? new Date(campaign.startedAt) : null,
        completedAt: campaign.completedAt
          ? new Date(campaign.completedAt)
          : null,
      },
    });
  }

  async list(): Promise<Campaign[]> {
    const campaigns = await prisma.campaign.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      agentId: campaign.agentId,
      csvPath: campaign.csvPath,
      totalContacts: campaign.totalContacts,
      completedCalls: campaign.completedCalls,
      failedCalls: campaign.failedCalls,
      status: campaign.status as Campaign["status"],
      leads: campaign.leads as unknown as CampaignLead[],
      createdAt: campaign.createdAt.toISOString(),
      startedAt: campaign.startedAt
        ? campaign.startedAt.toISOString()
        : undefined,
      completedAt: campaign.completedAt
        ? campaign.completedAt.toISOString()
        : undefined,
    }));
  }

  async findById(id: string): Promise<Campaign | undefined> {
    const campaign = await prisma.campaign.findUnique({
      where: {
        id,
      },
    });

    if (!campaign) return undefined;

    return {
      id: campaign.id,
      name: campaign.name,
      agentId: campaign.agentId,
      csvPath: campaign.csvPath,
      totalContacts: campaign.totalContacts,
      completedCalls: campaign.completedCalls,
      failedCalls: campaign.failedCalls,
      status: campaign.status as Campaign["status"],
      leads: campaign.leads as unknown as CampaignLead[],
      createdAt: campaign.createdAt.toISOString(),
      startedAt: campaign.startedAt
        ? campaign.startedAt.toISOString()
        : undefined,
      completedAt: campaign.completedAt
        ? campaign.completedAt.toISOString()
        : undefined,
    };
  }
}