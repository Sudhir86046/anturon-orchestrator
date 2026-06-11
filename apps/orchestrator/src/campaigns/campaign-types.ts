export type CampaignStatus = "pending" | "running" | "completed" | "failed";

export interface CampaignLead {
  name?: string;
  phone: string;
  status: "pending" | "called" | "failed";
  callId?: string;
  error?: string;
}

export interface Campaign {
  id: string;
  name: string;
  agentId: string;
  csvPath: string;
  totalContacts: number;
  completedCalls: number;
  failedCalls: number;
  status: CampaignStatus;
  leads: CampaignLead[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}