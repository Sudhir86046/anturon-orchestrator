import { prisma } from "../db/prisma";
import { CallSession } from "../calls/call-session";

export class CallStore {
  async save(session: CallSession) {
    return prisma.call.create({
      data: {
        callId: session.callId,
        callerNumber: session.callerNumber,
        agentId: session.agentId,
        status: session.status,
        inputAudio: session.inputAudio,
        transcript: session.transcript,
        responseText: session.responseText,
        outputAudio: session.outputAudio,
        startedAt: new Date(session.startedAt),
        endedAt: session.endedAt ? new Date(session.endedAt) : null,
      },
    });
  }

  async list(): Promise<CallSession[]> {
    const calls = await prisma.call.findMany({
      orderBy: {
        startedAt: "desc",
      },
    });

    return calls.map((call) => ({
      callId: call.callId,
      callerNumber: call.callerNumber || undefined,
      agentId: call.agentId || undefined,
      status: call.status as CallSession["status"],
      inputAudio: call.inputAudio || undefined,
      transcript: call.transcript || undefined,
      responseText: call.responseText || undefined,
      outputAudio: call.outputAudio || undefined,
      startedAt: call.startedAt.toISOString(),
      endedAt: call.endedAt ? call.endedAt.toISOString() : undefined,
    }));
  }
}