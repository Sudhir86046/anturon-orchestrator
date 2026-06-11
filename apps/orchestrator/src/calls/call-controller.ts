import { Orchestrator } from "../core/orchestrator";
import { CallSession } from "./call-session";
import { CallStore } from "../storage/call-store";
import { AgentService } from "../agents/agent-service";

const orchestrator = new Orchestrator();
const callStore = new CallStore();
const agentService = new AgentService();

export class CallController {
  async handleIncomingCall(payload: {
    callId: string;
    callerNumber?: string;
    audioPath: string;
    agentId?: string;
  }) {
    const agent = payload.agentId
      ? await agentService.findById(payload.agentId)
      : undefined;

    const session: CallSession = {
      callId: payload.callId,
      callerNumber: payload.callerNumber,
      agentId: payload.agentId,
      status: "processing",
      inputAudio: payload.audioPath,
      startedAt: new Date().toISOString(),
    };

    try {
      const result = await orchestrator.execute(
        {
          audio: payload.audioPath,
        },
        agent || undefined
      );

      session.status = "completed";
      session.transcript = result.transcript;
      session.responseText = result.llmResponse;
      session.outputAudio = result.audioOutputPath;
      session.endedAt = new Date().toISOString();

      await callStore.save(session);

      return session;
    } catch (error: any) {
      session.status = "failed";
      session.endedAt = new Date().toISOString();

      await callStore.save(session);

      throw error;
    }
  }

  async listSessions() {
    return await callStore.list();
  }
}