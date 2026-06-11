import { WorkflowContext } from "../workflow-context";
import { WorkflowStep } from "../workflow-step";
import { KnowledgeService } from "../../knowledge/knowledge-service";

export class KnowledgeStep implements WorkflowStep {
  async execute(context: WorkflowContext): Promise<WorkflowContext> {
    if (!context.agent?.id || !context.transcript) {
      context.knowledgeContext = "";
      return context;
    }

    const knowledgeService = new KnowledgeService();

    context.knowledgeContext = await knowledgeService.getAgentContext(
      context.agent.id,
      context.transcript
    );

    console.log(
      "Knowledge Context:",
      context.knowledgeContext || "No context found"
    );

    return context;
  }
}