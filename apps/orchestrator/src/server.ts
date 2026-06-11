import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import axios from "axios";

import { DashboardService } from "./dashboard/dashboard-service";
import { CampaignService } from "./campaigns/campaign-service";
import { KnowledgeService } from "./knowledge/knowledge-service";
import { TwilioWebhook } from "./webhooks/twilio-webhook";
import { Orchestrator } from "./core/orchestrator";
import { CallController } from "./calls/call-controller";
import { AgentService } from "./agents/agent-service";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 3000);

const uploadDir = path.resolve("./audio/uploads");
const outputDir = path.resolve("./audio/output");

fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

app.use("/audio/output", express.static(outputDir));

const upload = multer({
  dest: uploadDir,
});

const orchestrator = new Orchestrator();
const callController = new CallController();
const agentService = new AgentService();
const twilioWebhook = new TwilioWebhook();
const knowledgeService = new KnowledgeService();
const campaignService = new CampaignService();
const dashboardService = new DashboardService();

function buildAudioUrl(audioOutputPath?: string) {
  if (!audioOutputPath) return null;
  return `/audio/output/${path.basename(audioOutputPath)}`;
}

app.get("/", (_, res) => {
  res.json({
    service: "Anturon Orchestrator",
    status: "running",
    version: "1.0.0",
  });
});

app.get("/health", (_, res) => {
  res.json({
    status: "ok",
    service: "anturon-orchestrator",
  });
});

app.post("/agents", async (req, res) => {
  try {
    const { name, systemPrompt, language } = req.body;

    if (!name || !systemPrompt) {
      return res.status(400).json({
        success: false,
        error: "name and systemPrompt are required",
      });
    }

    const agent = await agentService.create({
      name,
      systemPrompt,
      language,
    });

    return res.json({
      success: true,
      agent,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/agents", async (_, res) => {
  try {
    const agents = await agentService.list();

    return res.json({
      success: true,
      agents,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/orchestrate", async (req, res) => {
  try {
    const { audioPath } = req.body;

    if (!audioPath) {
      return res.status(400).json({
        success: false,
        error: "audioPath is required",
      });
    }

    const result = await orchestrator.execute({
      audio: audioPath,
    });

    return res.json({
      success: true,
      transcript: result.transcript,
      response: result.llmResponse,
      audioOutputPath: result.audioOutputPath,
      audioOutputUrl: buildAudioUrl(result.audioOutputPath),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/orchestrate/upload", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "audio file is required",
      });
    }

    const result = await orchestrator.execute({
      audio: req.file.path,
    });

    return res.json({
      success: true,
      originalFileName: req.file.originalname,
      uploadedPath: req.file.path,
      transcript: result.transcript,
      response: result.llmResponse,
      audioOutputPath: result.audioOutputPath,
      audioOutputUrl: buildAudioUrl(result.audioOutputPath),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/calls/incoming", async (req, res) => {
  try {
    const { callId, callerNumber, audioPath, agentId } = req.body;

    if (!callId || !audioPath) {
      return res.status(400).json({
        success: false,
        error: "callId and audioPath are required",
      });
    }

    const session = await callController.handleIncomingCall({
      callId,
      callerNumber,
      audioPath,
      agentId,
    });

    return res.json({
      success: true,
      session: {
        ...session,
        outputAudioUrl: buildAudioUrl(session.outputAudio),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/calls/incoming/upload", upload.single("audio"), async (req, res) => {
  try {
    const { callId, callerNumber, agentId } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "audio file is required",
      });
    }

    if (!callId) {
      return res.status(400).json({
        success: false,
        error: "callId is required",
      });
    }

    const session = await callController.handleIncomingCall({
      callId,
      callerNumber,
      agentId,
      audioPath: req.file.path,
    });

    return res.json({
      success: true,
      originalFileName: req.file.originalname,
      uploadedPath: req.file.path,
      session: {
        ...session,
        outputAudioUrl: buildAudioUrl(session.outputAudio),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/calls", async (_, res) => {
  try {
    const calls = await callController.listSessions();

    return res.json({
      success: true,
      calls: calls.map((session: any) => ({
        ...session,
        outputAudioUrl: buildAudioUrl(session.outputAudio),
      })),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/conversations", (_, res) => {
  const filePath = path.resolve("./storage/conversations.json");

  if (!fs.existsSync(filePath)) {
    return res.json({
      success: true,
      conversations: [],
    });
  }

  const raw = fs.readFileSync(filePath, "utf-8");

  return res.json({
    success: true,
    conversations: raw ? JSON.parse(raw) : [],
  });
});

app.post(
  "/agents/:agentId/knowledge/upload",
  upload.single("file"),
  async (req, res) => {
    try {
      const agentId = String(req.params.agentId);

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "knowledge file is required",
        });
      }

      const record = await knowledgeService.uploadKnowledge({
        agentId,
        filePath: req.file.path,
        originalName: req.file.originalname,
      });

      return res.json({
        success: true,
        knowledge: record,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);
app.get("/agents/:agentId/knowledge", async (req, res) => {
  const agentId = String(req.params.agentId);

  return res.json({
    success: true,
    knowledge: await knowledgeService.list(agentId),
  });
});
app.post("/campaigns/upload", upload.single("csv"), async (req, res) => {
  try {
    const { name, agentId } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "csv file is required",
      });
    }

    if (!name || !agentId) {
      return res.status(400).json({
        success: false,
        error: "name and agentId are required",
      });
    }

    const campaign = await campaignService.createCampaign({
      name,
      agentId,
      csvPath: req.file.path,
    });

    return res.json({
      success: true,
      campaign,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/campaigns", async (_, res) => {
  return res.json({
    success: true,
    campaigns: await campaignService.listCampaigns(),
  });
});

app.get("/campaigns/:id", async (req, res) => {
  const campaign = await campaignService.findById(String(req.params.id));

  if (!campaign) {
    return res.status(404).json({
      success: false,
      error: "Campaign not found",
    });
  }

  return res.json({
    success: true,
    campaign,
  });
});

app.post("/campaigns/:id/start", async (req, res) => {
  try {
    const campaign = await campaignService.startCampaign(String(req.params.id));

    return res.json({
      success: true,
      campaign,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post(
  "/webhooks/twilio/incoming",
  express.urlencoded({ extended: false }),
  (req, res) => {
    const call = twilioWebhook.handleIncomingCall(req.body);

    console.log("Twilio incoming call:", call);

    const twiml = twilioWebhook.generateVoiceResponse(
      "Hello, welcome to Anturon Voice Assistant. Please say how I can help you."
    );

    res.type("text/xml");
    return res.send(twiml);
  }
);

app.post(
  "/webhooks/twilio/recording",
  express.urlencoded({ extended: false }),
  async (req, res) => {
    try {
      const callId = req.body.CallSid;
      const recordingUrl = req.body.RecordingUrl;
      const from = req.body.From;

      if (!callId || !recordingUrl) {
        res.type("text/xml");
        return res.send(
          twilioWebhook.generateVoiceResponse(
            "Sorry, I could not receive your recording. Please try again."
          )
        );
      }

      const audioResponse = await axios.get(`${recordingUrl}.wav`, {
        responseType: "arraybuffer",
      });

      const twilioAudioPath = path.resolve(
        "./audio/uploads",
        `${callId}-${Date.now()}.wav`
      );

      fs.writeFileSync(twilioAudioPath, Buffer.from(audioResponse.data));

      const session = await callController.handleIncomingCall({
        callId,
        callerNumber: from,
        audioPath: twilioAudioPath,
        agentId: "agent_1780804724110",
      });

      const outputAudioUrl = buildAudioUrl(session.outputAudio);

      const publicBaseUrl =
        process.env.PUBLIC_BASE_URL || "http://localhost:3000";

      const fullAudioUrl = `${publicBaseUrl}${outputAudioUrl}`;

      res.type("text/xml");
      return res.send(twilioWebhook.generatePlayResponse(fullAudioUrl));
    } catch (error: any) {
      console.error("Twilio recording error:", error.message);

      res.type("text/xml");
      return res.send(
        twilioWebhook.generateVoiceResponse(
          "Sorry, something went wrong. Please try again."
        )
      );
    }
  }
);
app.post("/test/knowledge", async (req, res) => {
  try {
    const { agentId, question } = req.body;

    if (!agentId || !question) {
      return res.status(400).json({
        success: false,
        error: "agentId and question are required",
      });
    }

    const context = await knowledgeService.getAgentContext(
      agentId,
      question
    );

    return res.json({
      success: true,
      context,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
app.get("/dashboard/stats", async (_, res) => {
  try {
    const stats = await dashboardService.getStats();

    return res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/dashboard/recent-calls", async (_, res) => {
  try {
    const calls = await dashboardService.getRecentCalls();

    return res.json({
      success: true,
      calls,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/dashboard/recent-agents", async (_, res) => {
  try {
    const agents = await dashboardService.getRecentAgents();

    return res.json({
      success: true,
      agents,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/dashboard/recent-campaigns", async (_, res) => {
  try {
    const campaigns = await dashboardService.getRecentCampaigns();

    return res.json({
      success: true,
      campaigns,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
app.listen(PORT, () => {
  console.log(`🚀 Orchestrator running on http://localhost:${PORT}`);
});