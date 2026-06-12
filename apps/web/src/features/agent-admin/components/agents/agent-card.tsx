

import { Bot, Edit2, Trash2 } from "lucide-react";
import { Card, Button } from "@heroui/react";
import { useTranslation } from "react-i18next";

interface Skill {
  name: string;
  description?: string;
}

interface Agent {
  id: string;
  name: string;
  systemInstructions: string;
  llmProvider: string;
  llmModel: string;
  tier: string;
  isRouter: boolean;
  maxSteps: number;
  isActive: boolean;
  skills: Skill[];
  toolBindings: Array<{ toolDefinition: { id: string; toolName: string } }>;
}

interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (id: string) => void;
}

export function AgentCard({ agent, onEdit, onDelete }: AgentCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="bg-content1 border border-default-150 p-5 rounded-xl flex flex-col justify-between hover:border-default-300 transition-all duration-300 shadow-sm">
      <div className="space-y-4">
        {/* Card Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg border ${
                agent.isRouter
                  ? "bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/20 dark:border-purple-500/30 text-purple-600 dark:text-purple-400"
                  : "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base leading-tight">
                {agent.name}
              </h3>
              <span className="text-[10px] uppercase font-bold text-default-400 tracking-wider font-mono">
                {agent.llmProvider} ({agent.llmModel})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                agent.isActive ? "bg-emerald-400 animate-pulse" : "bg-default-300"
              }`}
            />
            <span className="text-xs text-default-450">
              {agent.isActive
                ? t("agents.list.active")
                : t("agents.list.inactive")}
            </span>
          </div>
        </div>

        {/* Instructions Preview */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold uppercase text-default-400 tracking-wider">
            Instructions
          </span>
          <p className="text-xs text-default-600 line-clamp-3 leading-relaxed bg-default-50 p-2 rounded border border-default-150">
            {agent.systemInstructions}
          </p>
        </div>

        {/* Skills Info */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold uppercase text-default-400 tracking-wider">
            Skills
          </span>
          <div className="flex flex-wrap gap-1">
            {agent.skills?.map((skill, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-default-100 text-default-600 text-[10px] rounded border border-default-150"
              >
                {skill.name}
              </span>
            ))}
            {(!agent.skills || agent.skills.length === 0) && (
              <span className="text-[10px] text-default-400 italic">
                {t("agents.list.noSkills")}
              </span>
            )}
          </div>
        </div>

        {/* Tools Bindings Info */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold uppercase text-default-400 tracking-wider">
            MCP Tools ({agent.toolBindings?.length || 0})
          </span>
          <div className="flex flex-wrap gap-1">
            {agent.toolBindings?.slice(0, 4).map((b, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] rounded"
              >
                {b.toolDefinition.toolName}
              </span>
            ))}
            {agent.toolBindings?.length > 4 && (
              <span className="text-[10px] text-default-400 font-mono">
                +{agent.toolBindings.length - 4} tools
              </span>
            )}
            {(!agent.toolBindings || agent.toolBindings.length === 0) && (
              <span className="text-[10px] text-default-400 italic">
                {t("agents.list.noTools")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions Footer */}
      <div className="flex items-center justify-end gap-1.5 border-t border-default-150 mt-5 pt-3">
        <Button
          className="cursor-pointer border border-default-250 text-default-600 hover:bg-default-50"
          size="sm"
          variant="ghost"
          onClick={() => onEdit(agent)}
        >
          <Edit2 className="h-3.5 w-3.5" />
          {t("agents.list.edit")}
        </Button>
        <Button
          className="cursor-pointer"
          size="sm"
          variant="danger"
          onClick={() => onDelete(agent.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t("agents.list.delete")}
        </Button>
      </div>
    </Card>
  );
}
