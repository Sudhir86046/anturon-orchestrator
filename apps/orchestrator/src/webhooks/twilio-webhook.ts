export class TwilioWebhook {
  handleIncomingCall(payload: any) {
    const callSid = payload.CallSid;
    const from = payload.From;
    const to = payload.To;

    return {
      callId: callSid,
      callerNumber: from,
      receiverNumber: to,
      provider: "twilio",
      status: "received",
      receivedAt: new Date().toISOString(),
    };
  }

  generateVoiceResponse(message: string) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${message}</Say>
  <Record
    action="/webhooks/twilio/recording"
    method="POST"
    maxLength="20"
    playBeep="true"
    trim="trim-silence"
  />
</Response>`;
  }

  generatePlayResponse(audioUrl: string) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${audioUrl}</Play>
</Response>`;
  }
}