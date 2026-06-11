import fs from "fs";
import { parse } from "csv-parse/sync";
import { Campaign, CampaignLead } from "./campaign-types";
import { CampaignStore } from "../storage/campaign-store";
import { CallController } from "../calls/call-controller";

const store = new CampaignStore();
const callController = new CallController();

export class CampaignService {
  async createCampaign(params: {
    name: string;
    agentId: string;
    csvPath: string;
  }): Promise<Campaign> {
    const csv = fs.readFileSync(params.csvPath, "utf-8");

    const rows = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as any[];

    const leads: CampaignLead[] = rows
      .map((row) => ({
        name: row.name || row.Name || "",
        phone: row.phone || row.Phone || row.mobile || row.Mobile || "",
        status: "pending" as const,
      }))
      .filter((lead) => lead.phone);

    const campaign: Campaign = {
      id: `campaign_${Date.now()}`,
      name: params.name,
      agentId: params.agentId,
      csvPath: params.csvPath,
      totalContacts: leads.length,
      completedCalls: 0,
      failedCalls: 0,
      status: "pending",
      leads,
      createdAt: new Date().toISOString(),
    };

    await store.save(campaign);

    return campaign;
  }

  async startCampaign(id: string): Promise<Campaign> {
    const campaign = await store.findById(id);

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    campaign.status = "running";
    campaign.startedAt = new Date().toISOString();

    await store.update(campaign);

    for (const lead of campaign.leads) {
      try {
        const callId = `call_${campaign.id}_${Date.now()}`;

        const session = await callController.handleIncomingCall({
          callId,
          callerNumber: lead.phone,
          agentId: campaign.agentId,
          audioPath: "./audio/sample.wav",
        });

        lead.status = "called";
        lead.callId = session.callId;
        campaign.completedCalls += 1;
      } catch (error: any) {
        lead.status = "failed";
        lead.error = error.message;
        campaign.failedCalls += 1;
      }

      await store.update(campaign);
    }

    campaign.status = "completed";
    campaign.completedAt = new Date().toISOString();

    await store.update(campaign);

    return campaign;
  }

  async listCampaigns() {
    return await store.list();
  }

  async findById(id: string) {
    return await store.findById(id);
  }
}