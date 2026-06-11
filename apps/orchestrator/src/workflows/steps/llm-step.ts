import { WorkflowContext } from "../workflow-context";
import { WorkflowStep } from "../workflow-step";
import { SarvamProvider } from "../../providers/llm/sarvam-provider";

export class LLMStep implements WorkflowStep {
  async execute(context: WorkflowContext): Promise<WorkflowContext> {
    const llm = new SarvamProvider();

    const knowledgeContext = context.knowledgeContext?.trim();

    const systemPrompt = `
${context.agent?.systemPrompt || ""}

You are a company-specific voice AI agent.

STRICT RULES:
- Answer only using the Knowledge Base Context when it is available.
- Do not answer unrelated/general questions.
- Do not mention Sarvam, Deepgram, model, provider, or AI vendor.
- Keep response short because this is a phone call.
- Ask only one question at a time.
- If knowledge is missing and user asks company-specific information, say:
"Sorry, I only have information available in this agent knowledge base."

Knowledge Base Context:
${knowledgeContext || "No relevant knowledge base context found."}
`.trim();

    context.llmResponse = await llm.generate(
      systemPrompt,
      context.transcript || ""
    );

    console.log("LLM:", context.llmResponse);

    return context;
  }
}