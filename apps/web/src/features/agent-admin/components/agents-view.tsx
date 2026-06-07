"use client";

import * as React from "react";
import { Bot, Plus, Trash2, Edit2, X, AlertCircle } from "lucide-react";
import {
  Card,
  Button,
  Input,
  TextArea,
  Checkbox,
  Spinner,
  TextField,
  Label,
} from "@heroui/react";
import { useTranslations } from "next-intl";

import { adminService } from "@/src/features/agent-admin/services/admin.service";

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
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formName, setFormName] = React.useState("");
  const [formPrompt, setFormPrompt] = React.useState("");
  const [formProvider, setFormProvider] = React.useState("openai");
  const [formModel, setFormModel] = React.useState("gpt-4o-mini");
  const [formTier, setFormTier] = React.useState("smart");
  const [formIsRouter, setFormIsRouter] = React.useState(false);
  const [formMaxSteps, setFormMaxSteps] = React.useState(10);
  const [formIsActive, setFormIsActive] = React.useState(true);
  const [formSkills, setFormSkills] = React.useState<Skill[]>([]);
  const [formSelectedTools, setFormSelectedTools] = React.useState<string[]>(
    [],
  );

  // Skill Form Helper
  const [newSkillName, setNewSkillName] = React.useState("");
  const [newSkillDesc, setNewSkillDesc] = React.useState("");

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

  const resetForm = () => {
    setFormName("");
    setFormPrompt("");
    setFormProvider("openai");
    setFormModel("gpt-4o-mini");
    setFormTier("smart");
    setFormIsRouter(false);
    setFormMaxSteps(10);
    setFormIsActive(true);
    setFormSkills([]);
    setFormSelectedTools([]);
    setEditingId(null);
    setIsEditing(false);
  };

  const handleEdit = (agent: Agent) => {
    setEditingId(agent.id);
    setFormName(agent.name);
    setFormPrompt(agent.systemInstructions);
    setFormProvider(agent.llmProvider || "openai");
    setFormModel(agent.llmModel || "gpt-4o-mini");
    setFormTier(agent.tier || "smart");
    setFormIsRouter(agent.isRouter);
    setFormMaxSteps(agent.maxSteps || 10);
    setFormIsActive(agent.isActive);
    setFormSkills(agent.skills || []);
    setFormSelectedTools(
      agent.toolBindings?.map((b) => b.toolDefinition.id) || [],
    );
    setIsEditing(true);
  };

  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    setFormSkills([
      ...formSkills,
      { name: newSkillName.trim(), description: newSkillDesc.trim() },
    ]);
    setNewSkillName("");
    setNewSkillDesc("");
  };

  const handleRemoveSkill = (index: number) => {
    setFormSkills(formSkills.filter((_, i) => i !== index));
  };

  const handleToggleTool = (toolId: string) => {
    if (formSelectedTools.includes(toolId)) {
      setFormSelectedTools(formSelectedTools.filter((id) => id !== toolId));
    } else {
      setFormSelectedTools([...formSelectedTools, toolId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPrompt.trim()) return;

    const payload = {
      name: formName,
      systemInstructions: formPrompt,
      llmProvider: formProvider,
      llmModel: formModel,
      tier: formTier,
      isRouter: formIsRouter,
      maxSteps: formMaxSteps,
      isActive: formIsActive,
      skills: formSkills,
      toolIds: formSelectedTools,
    };

    try {
      if (editingId) {
        await adminService.updateAgent(editingId, payload);
      } else {
        await adminService.createAgent(payload);
      }
      resetForm();
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || t("agents.alert.saveFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("agents.confirm.delete"))) return;
    try {
      await adminService.deleteAgent(id);
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
        <Card className="bg-content1 border border-default-150 p-6 rounded-xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="flex items-center justify-between border-b border-default-150 pb-3">
              <h2 className="text-lg font-bold text-foreground">
                {editingId ? t("agents.editor.titleEdit", { name: formName }) : t("agents.editor.titleCreate")}
              </h2>
              <Button
                isIconOnly
                className="cursor-pointer"
                size="sm"
                variant="danger"
                onClick={resetForm}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Left Column - Core Config */}
              <div className="space-y-4">
                <TextField isRequired className="w-full" name="name">
                  <Label className="text-default-500 text-xs font-semibold mb-1 block">
                    {t("agents.editor.name")}
                  </Label>
                  <Input
                    className="text-foreground"
                    placeholder={t("agents.editor.namePlaceholder")}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </TextField>

                <TextField
                  isRequired
                  className="w-full"
                  name="systemInstructions"
                >
                  <Label className="text-default-500 text-xs font-semibold mb-1 block">
                    {t("agents.editor.instructions")}
                  </Label>
                  <TextArea
                    className="text-foreground"
                    placeholder={t("agents.editor.instructionsPlaceholder")}
                    rows={6}
                    value={formPrompt}
                    onChange={(e) => setFormPrompt(e.target.value)}
                  />
                </TextField>

                <div className="grid gap-4 grid-cols-2">
                  <div>
                    <span className="text-xs font-semibold text-default-500 block mb-1">
                      {t("agents.editor.llmProvider")}
                    </span>
                    <select
                      className="w-full bg-default-100 text-foreground border border-default-200 hover:border-default-300 focus:border-primary rounded-lg p-2.5 text-sm focus:outline-none"
                      value={formProvider}
                      onChange={(e) => setFormProvider(e.target.value)}
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="local">Local AI (Ollama)</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-default-500 block mb-1">
                      {t("agents.editor.llmModel")}
                    </span>
                    <input
                      className="w-full bg-default-100 text-foreground border border-default-200 hover:border-default-300 focus:border-primary rounded-lg p-2.5 text-sm focus:outline-none"
                      placeholder={t("agents.editor.llmModelPlaceholder")}
                      type="text"
                      value={formModel}
                      onChange={(e) => setFormModel(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 grid-cols-2">
                  <TextField className="w-full" name="maxSteps">
                    <Label className="text-default-500 text-xs font-semibold mb-1 block">
                      {t("agents.editor.maxSteps")}
                    </Label>
                    <Input
                      className="text-foreground"
                      max={20}
                      min={1}
                      type="number"
                      value={formMaxSteps.toString()}
                      onChange={(e) => setFormMaxSteps(Number(e.target.value))}
                    />
                  </TextField>
                  <div>
                    <span className="text-xs font-semibold text-default-500 block mb-1">
                      {t("agents.editor.active")}
                    </span>
                    <div className="flex h-[42px] items-center">
                      <Checkbox
                        isSelected={formIsActive}
                        onChange={setFormIsActive}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-6 pt-2">
                  <Checkbox
                    isSelected={formIsRouter}
                    onChange={setFormIsRouter}
                  >
                    <Label className="text-sm font-medium text-default-600">
                      {t("agents.editor.routerAgent")}
                    </Label>
                  </Checkbox>
                </div>
              </div>

              {/* Right Column - Skills & Tools Binding */}
              <div className="space-y-6">
                {/* Skills Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-default-500">
                    {t("agents.editor.skills")}
                  </h3>
                  {/* Skill List */}
                  <div className="flex flex-wrap gap-2">
                    {formSkills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-default-100 text-foreground text-xs rounded-full border border-default-200"
                      >
                        <span className="font-bold">{skill.name}</span>
                        <button
                          className="text-default-400 hover:text-danger cursor-pointer"
                          type="button"
                          onClick={() => handleRemoveSkill(index)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    {formSkills.length === 0 && (
                      <span className="text-xs text-default-400 italic">
                        {t("agents.editor.noSkills")}
                      </span>
                    )}
                  </div>
                  {/* Skill Add Input */}
                  <div className="grid gap-2 grid-cols-3 items-end border border-default-250 p-3 rounded-lg bg-default-50">
                    <div className="col-span-1">
                      <input
                        className="w-full bg-default-100 text-foreground border border-default-200 rounded p-2 text-xs focus:outline-none focus:border-emerald-500"
                        placeholder={t("agents.editor.skillNamePlaceholder")}
                        type="text"
                        value={newSkillName}
                        onChange={(e) => setNewSkillName(e.target.value)}
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        className="w-full bg-default-100 text-foreground border border-default-200 rounded p-2 text-xs focus:outline-none focus:border-emerald-500"
                        placeholder={t("agents.editor.skillDescPlaceholder")}
                        type="text"
                        value={newSkillDesc}
                        onChange={(e) => setNewSkillDesc(e.target.value)}
                      />
                    </div>
                    <Button
                      size="sm"
                      type="button"
                      variant="secondary"
                      onClick={handleAddSkill}
                    >
                      {t("agents.editor.addSkill")}
                    </Button>
                  </div>
                </div>

                {/* Tools Selection Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-default-500">
                    {t("agents.editor.mcpTools")}
                  </h3>
                  <div className="max-h-[220px] overflow-y-auto border border-default-200 rounded-lg p-3 space-y-2.5 bg-default-50">
                    {tools.map((tool) => {
                      const isSelected = formSelectedTools.includes(tool.id);

                      return (
                        <div
                          key={tool.id}
                          className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors border focus:outline-none ${
                            isSelected
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                              : "hover:bg-default-100/60 border-transparent text-default-500"
                          }`}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleToggleTool(tool.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleToggleTool(tool.id);
                            }
                          }}
                        >
                          <Checkbox
                            className="pointer-events-none mt-0.5"
                            isSelected={isSelected}
                          />
                          <div>
                            <p
                              className={`text-xs font-semibold ${isSelected ? "text-emerald-600 dark:text-emerald-450" : "text-foreground"}`}
                            >
                              {tool.toolName}
                            </p>
                            <p className="text-[10px] text-default-400 truncate max-w-[280px]">
                              {tool.description || t("agents.editor.noDesc")} (
                              {tool.integration.name})
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {tools.length === 0 && (
                      <p className="text-xs text-default-400 italic text-center py-4">
                        {t("agents.editor.noMcpTools")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-default-150">
              <Button
                className="cursor-pointer border border-default-250 text-default-500 hover:bg-default-100"
                type="button"
                variant="ghost"
                onClick={resetForm}
              >
                {t("agents.editor.cancel")}
              </Button>
              <Button
                className="cursor-pointer font-bold"
                type="submit"
                variant="primary"
              >
                {t("agents.editor.save")}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Agents Listing Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <Card
            key={agent.id}
            className="bg-content1 border border-default-150 p-5 rounded-xl flex flex-col justify-between hover:border-default-300 transition-all duration-300 shadow-sm"
          >
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
                    className={`inline-block h-2 w-2 rounded-full ${agent.isActive ? "bg-emerald-400 animate-pulse" : "bg-default-300"}`}
                  />
                  <span className="text-xs text-default-450">
                    {agent.isActive ? t("agents.list.active") : t("agents.list.inactive")}
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
                onClick={() => handleEdit(agent)}
              >
                <Edit2 className="h-3.5 w-3.5" />
                {t("agents.list.edit")}
              </Button>
              <Button
                className="cursor-pointer"
                size="sm"
                variant="danger"
                onClick={() => handleDelete(agent.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("agents.list.delete")}
              </Button>
            </div>
          </Card>
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
    </div>
  );
}
