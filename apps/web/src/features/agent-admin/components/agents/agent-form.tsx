"use client";

import * as React from "react";
import { X, Plus } from "lucide-react";
import { Card, Button, Input, TextArea, Checkbox, TextField, Label } from "@heroui/react";
import { useTranslations } from "next-intl";

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

interface AgentFormProps {
  initialAgent: Agent | null;
  tools: ToolOption[];
  onSubmit: (payload: any) => Promise<void>;
  onCancel: () => void;
}

export function AgentForm({
  initialAgent,
  tools,
  onSubmit,
  onCancel,
}: AgentFormProps) {
  const t = useTranslations();

  // Form State
  const [formName, setFormName] = React.useState("");
  const [formPrompt, setFormPrompt] = React.useState("");
  const [formProvider, setFormProvider] = React.useState("openai");
  const [formModel, setFormModel] = React.useState("gpt-4o-mini");
  const [formTier, setFormTier] = React.useState("smart");
  const [formIsRouter, setFormIsRouter] = React.useState(false);
  const [formMaxSteps, setFormMaxSteps] = React.useState(10);
  const [formIsActive, setFormIsActive] = React.useState(true);
  const [formSkills, setFormSkills] = React.useState<Skill[]>([]);
  const [formSelectedTools, setFormSelectedTools] = React.useState<string[]>([]);

  // Skill Form Helper
  const [newSkillName, setNewSkillName] = React.useState("");
  const [newSkillDesc, setNewSkillDesc] = React.useState("");

  // Populate from initialAgent
  React.useEffect(() => {
    if (initialAgent) {
      setFormName(initialAgent.name);
      setFormPrompt(initialAgent.systemInstructions);
      setFormProvider(initialAgent.llmProvider || "openai");
      setFormModel(initialAgent.llmModel || "gpt-4o-mini");
      setFormTier(initialAgent.tier || "smart");
      setFormIsRouter(initialAgent.isRouter);
      setFormMaxSteps(initialAgent.maxSteps || 10);
      setFormIsActive(initialAgent.isActive);
      setFormSkills(initialAgent.skills || []);
      setFormSelectedTools(
        initialAgent.toolBindings?.map((b) => b.toolDefinition.id) || [],
      );
    } else {
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
    }
  }, [initialAgent]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPrompt.trim()) return;

    onSubmit({
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
    });
  };

  return (
    <Card className="bg-content1 border border-default-150 p-6 rounded-xl">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="flex items-center justify-between border-b border-default-150 pb-3">
          <h2 className="text-lg font-bold text-foreground">
            {initialAgent
              ? t("agents.editor.titleEdit", { name: formName })
              : t("agents.editor.titleCreate")}
          </h2>
          <Button
            isIconOnly
            className="cursor-pointer"
            size="sm"
            variant="danger"
            onClick={onCancel}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column - Core Config */}
          <div className="space-y-4">
            <TextField isRequired className="w-full" name="name" value={formName} onChange={setFormName}>
              <Label className="text-default-500 text-xs font-semibold mb-1 block">
                {t("agents.editor.name")}
              </Label>
              <Input
                className="text-foreground"
                placeholder={t("agents.editor.namePlaceholder")}
              />
            </TextField>

            <TextField isRequired className="w-full" name="systemInstructions" value={formPrompt} onChange={setFormPrompt}>
              <Label className="text-default-500 text-xs font-semibold mb-1 block">
                {t("agents.editor.instructions")}
              </Label>
              <TextArea
                className="text-foreground"
                placeholder={t("agents.editor.instructionsPlaceholder")}
                rows={6}
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
              <TextField className="w-full" name="maxSteps" value={formMaxSteps.toString()} onChange={(val) => setFormMaxSteps(Number(val))}>
                <Label className="text-default-500 text-xs font-semibold mb-1 block">
                  {t("agents.editor.maxSteps")}
                </Label>
                <Input
                  className="text-foreground"
                  max={20}
                  min={1}
                  type="number"
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
              <Checkbox isSelected={formIsRouter} onChange={setFormIsRouter}>
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
                          className={`text-xs font-semibold ${
                            isSelected
                              ? "text-emerald-600 dark:text-emerald-450"
                              : "text-foreground"
                          }`}
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
            onClick={onCancel}
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
  );
}
