"use client";

import * as React from "react";
import { Bot, Plus, AlertCircle } from "lucide-react";
import { Button, Spinner } from "@heroui/react";
import { useTranslations } from "next-intl";

import { adminService } from "@/src/features/agent-admin/services/admin.service";
import { AgentForm } from "./agent-form";
import { AgentCard } from "./agent-card";
import { ConfirmModal } from "@/src/components/confirm-modal";

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

interface ToolOption {
  id: string;
  toolName: string;
  description?: string;
  integration: { name: string };
}

export default function AgentsView() {
  const t = useTranslations();
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [tools, setTools] = React.useState<ToolOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Form State
  const [isEditing, setIsEditing] = React.useState(false);
  const [editingAgent, setEditingAgent] = React.useState<Agent | null>(null);

  // Delete Confirm Modal State
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [agentToDeleteId, setAgentToDeleteId] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [agentsData, toolsData] = await Promise.all([
        adminService.getAgents(),
        adminService.getTools(),
      ]);

      setAgents(agentsData);
      setTools(toolsData);
    } catch (err: any) {
      setError(
        err.response?.data?.message || t("agents.alert.loadFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditingAgent(null);
    setIsEditing(false);
  };

  const handleSubmit = async (payload: any) => {
    try {
      if (editingAgent) {
        await adminService.updateAgent(editingAgent.id, payload);
      } else {
        await adminService.createAgent(payload);
      }
      setEditingAgent(null);
      setIsEditing(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || t("agents.alert.saveFailed"));
    }
  };

  const handleDelete = (id: string) => {
    setAgentToDeleteId(id);
    setIsDeleteOpen(true);
  };

  const confirmDeleteAgent = async () => {
    if (!agentToDeleteId) return;
    try {
      await adminService.deleteAgent(agentToDeleteId);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || t("agents.alert.deleteFailed"));
    }
  };

  if (loading && agents.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-3 items-center justify-center bg-background">
        <Spinner color="success" size="lg" />
        <span className="text-default-500 text-sm">
          {t("agents.loading")}
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bot className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
            {t("agents.title")}
          </h1>
          <p className="text-sm text-default-500">
            {t("agents.subtitle")}
          </p>
        </div>
        {!isEditing && (
          <Button
            className="cursor-pointer"
            variant="primary"
            onClick={() => setIsEditing(true)}
          >
            <Plus className="h-4 w-4" />
            {t("agents.create")}
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/10 bg-red-500/5 p-4 flex gap-3 text-red-400 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Editor Form Mode */}
      {isEditing && (
        <AgentForm
          initialAgent={editingAgent}
          tools={tools}
          onCancel={handleCancel}
          onSubmit={handleSubmit}
        />
      )}

      {/* Agents Listing Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        ))}

        {agents.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center gap-3 border border-dashed border-default-200 rounded-xl bg-default-100/20">
            <Bot className="h-10 w-10 text-default-400" />
            <p className="text-default-500 text-sm">
              {t("agents.list.noAgents")}
            </p>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsEditing(true)}
            >
              <Plus className="h-4 w-4" />
              {t("agents.create")}
            </Button>
          </div>
        )}
      </div>

      {/* Delete Agent Confirm Modal */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title={t("agents.list.delete")}
        description={t("agents.confirm.delete")}
        onConfirm={confirmDeleteAgent}
      />
    </div>
  );
}
