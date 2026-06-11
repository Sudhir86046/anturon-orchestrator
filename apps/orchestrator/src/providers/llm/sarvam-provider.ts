import axios from "axios";
import { env } from "../../config/env";

export class SarvamProvider {
  async generate(systemPrompt: string, userMessage: string): Promise<string> {
    const finalSystemPrompt = `
${systemPrompt}

CRITICAL RULES:
- Return ONLY the final answer.
- Do NOT show reasoning.
- Do NOT think step by step.
- Do NOT explain.
- Maximum 20 words.
- For greeting, directly answer with the instructed greeting.
`.trim();

    const response = await axios.post(
      "https://api.sarvam.ai/v1/chat/completions",
      {
        messages: [
          {
            role: "system",
            content: finalSystemPrompt,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        model: "sarvam-30b",
        temperature: 0,
        top_p: 1,
        max_tokens: 80,
      },
      {
        headers: {
          Authorization: `Bearer ${env.sarvamApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const message = response.data?.choices?.[0]?.message;
    const finishReason = response.data?.choices?.[0]?.finish_reason;

    console.log("SARVAM FINISH:", finishReason);

    if (message?.content) {
      return message.content.trim();
    }

    return "Hello sir, are you looking to buy, rent, or sell a property in Dubai?";
  }
}