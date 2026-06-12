
import * as React from "react";
import { X, Search } from "lucide-react";
import { Modal, Button, Input, TextArea, Checkbox, Switch, TextField, Label, InputGroup } from "@heroui/react";
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

interface ToolOption {
  id: string;
  toolName: string;
  description?: string;
  integration: { name: string };
}

interface AgentFormProps {
  isOpen: boolean;
  initialAgent: Agent | null;
  tools: ToolOption[];
  onSubmit: (payload: any) => Promise<void>;
  onCancel: () => void;
}

export function AgentForm({
  isOpen,
  initialAgent,
  tools,
  onSubmit,
  onCancel,
}: AgentFormProps) {
  const { t } = useTranslation();

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
  const [searchQuery, setSearchQuery] = React.useState("");

  // Skill Form Helper
  const [newSkillName, setNewSkillName] = React.useState("");
  const [newSkillDesc, setNewSkillDesc] = React.useState("");
  const [editSkillIndex, setEditSkillIndex] = React.useState<number | null>(null);

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
      setFormSkills((initialAgent.skills || []).filter(Boolean));
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

  const handleAddOrUpdateSkill = () => {
    if (!newSkillName.trim()) return;
    if (editSkillIndex !== null) {
      const updatedSkills = [...formSkills];
      updatedSkills[editSkillIndex] = { name: newSkillName.trim(), description: newSkillDesc.trim() };
      setFormSkills(updatedSkills);
      setEditSkillIndex(null);
    } else {
      setFormSkills([
        ...formSkills,
        { name: newSkillName.trim(), description: newSkillDesc.trim() },
      ]);
    }
    setNewSkillName("");
    setNewSkillDesc("");
  };

  const handleEditSkill = (index: number) => {
    setEditSkillIndex(index);
    setNewSkillName(formSkills[index].name);
    setNewSkillDesc(formSkills[index].description || "");
  };

  const handleRemoveSkill = (index: number) => {
    setFormSkills(formSkills.filter((_, i) => i !== index));
    if (editSkillIndex === index) {
      setEditSkillIndex(null);
      setNewSkillName("");
      setNewSkillDesc("");
    }
  };

  const handleToggleTool = (toolId: string) => {
    if (formSelectedTools.includes(toolId)) {
      setFormSelectedTools(formSelectedTools.filter((id) => id !== toolId));
    } else {
      setFormSelectedTools([...formSelectedTools, toolId]);
    }
  };

  const groupedTools = React.useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    
    const filteredTools = tools.filter(
      (tool) =>
        tool.toolName.toLowerCase().includes(lowerQuery) ||
        (tool.description?.toLowerCase() || "").includes(lowerQuery) ||
        (tool.integration.name.toLowerCase() || "").includes(lowerQuery)
    );

    return filteredTools.reduce((acc, tool) => {
      const integrationName = tool.integration.name || "Uncategorized";
      if (!acc[integrationName]) acc[integrationName] = [];
      acc[integrationName].push(tool);
      return acc;
    }, {} as Record<string, ToolOption[]>);
  }, [tools, searchQuery]);

  const handleToggleIntegration = (integrationTools: ToolOption[]) => {
    const toolIds = integrationTools.map((t) => t.id);
    const allSelected = toolIds.every((id) => formSelectedTools.includes(id));

    if (allSelected) {
      setFormSelectedTools(formSelectedTools.filter((id) => !toolIds.includes(id)));
    } else {
      const newSelections = new Set([...formSelectedTools, ...toolIds]);
      setFormSelectedTools(Array.from(newSelections));
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
      skills: formSkills.filter(Boolean),
      toolIds: formSelectedTools,
    });
  };

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && onCancel()} variant="blur">
      <Modal.Container size="lg" scroll="inside">
        <Modal.Dialog className="w-full sm:!max-w-7xl h-auto">
          <Modal.CloseTrigger />
          <form className="w-full" onSubmit={handleSubmit}>
            <Modal.Header className="flex flex-col gap-1 text-lg font-bold">
              {initialAgent
                ? t("agents.editor.titleEdit", { name: formName })
                : t("agents.editor.titleCreate")}
            </Modal.Header>
            <Modal.Body className="pb-6">
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
                      rows={10}
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
                        <Switch isSelected={formIsActive} onChange={setFormIsActive}>
                          <Switch.Control>
                            <Switch.Thumb />
                          </Switch.Control>
                        </Switch>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-6 pt-2">
                    <Switch isSelected={formIsRouter} onChange={setFormIsRouter}>
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                      <Switch.Content>
                        <Label className="text-sm font-medium text-default-600 cursor-pointer">
                          {t("agents.editor.routerAgent")}
                        </Label>
                      </Switch.Content>
                    </Switch>
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
                    <div className="flex flex-col gap-2">
                      {formSkills.map((skill, index) => (
                        <div
                          key={index}
                          className="flex items-start justify-between gap-2 p-2 bg-default-100 rounded-lg border border-default-200"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs text-foreground truncate">{skill.name}</p>
                            {skill.description && (
                              <p className="text-[10px] text-default-500 line-clamp-2 mt-0.5">{skill.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              className="text-default-400 hover:text-primary cursor-pointer p-1"
                              type="button"
                              onClick={() => handleEditSkill(index)}
                              title={t("agents.editor.editSkill")}
                            >
                              <span className="text-[10px] uppercase font-bold">Edit</span>
                            </button>
                            <button
                              className="text-default-400 hover:text-danger cursor-pointer p-1"
                              type="button"
                              onClick={() => handleRemoveSkill(index)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
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
                        onClick={handleAddOrUpdateSkill}
                      >
                        {editSkillIndex !== null ? t("agents.editor.updateSkill") : t("agents.editor.addSkill")}
                      </Button>
                    </div>
                  </div>

                  {/* Tools Selection Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-default-500">
                        {t("agents.editor.mcpTools")}
                      </h3>
                      <div className="w-1/2">
                        <InputGroup>
                          <InputGroup.Prefix>
                            <Search className="text-default-400 h-4 w-4" />
                          </InputGroup.Prefix>
                          <InputGroup.Input
                            className="bg-default-100 text-sm w-full"
                            placeholder={t("agents.editor.searchToolsPlaceholder")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </InputGroup>
                      </div>
                    </div>
                    <div className="max-h-[260px] overflow-y-auto border border-default-200 rounded-lg p-3 space-y-4 bg-default-50">
                      {Object.keys(groupedTools).length === 0 ? (
                        <p className="text-xs text-default-400 italic text-center py-4">
                          {t("agents.editor.noMcpTools")}
                        </p>
                      ) : (
                        Object.entries(groupedTools).map(([integrationName, groupTools]) => {
                          const toolIds = groupTools.map((t) => t.id);
                          const selectedCount = toolIds.filter((id) => formSelectedTools.includes(id)).length;
                          const allSelected = selectedCount === groupTools.length && groupTools.length > 0;
                          const isIndeterminate = selectedCount > 0 && selectedCount < groupTools.length;

                          return (
                            <div key={integrationName} className="space-y-1.5">
                              {/* Integration Header */}
                              <div 
                                className="flex items-center gap-2.5 p-1.5 rounded hover:bg-default-100/60 cursor-pointer"
                                onClick={() => handleToggleIntegration(groupTools)}
                              >
                                <Checkbox
                                  className="pointer-events-none mt-0"
                                  isIndeterminate={isIndeterminate}
                                  isSelected={allSelected}
                                />
                                <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                                  {integrationName}
                                </span>
                                <span className="text-[10px] text-default-400 font-medium">
                                  ({selectedCount}/{groupTools.length})
                                </span>
                              </div>
                              
                              {/* Tools List */}
                              <div className="pl-6 space-y-1">
                                {groupTools.map((tool) => {
                                  const isSelected = formSelectedTools.includes(tool.id);

                                  return (
                                    <div
                                      key={tool.id}
                                      className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors border focus:outline-none ${isSelected
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
                                          className={`text-xs font-semibold ${isSelected
                                            ? "text-emerald-600 dark:text-emerald-450"
                                            : "text-foreground"
                                            }`}
                                        >
                                          {tool.toolName}
                                        </p>
                                        <p className="text-[10px] text-default-400 truncate max-w-[260px]">
                                          {tool.description || t("agents.editor.noDesc")}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button
                className="cursor-pointer border border-default-250 text-default-500 hover:bg-default-100"
                type="button"
                variant="ghost"
                onPress={onCancel}
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
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
