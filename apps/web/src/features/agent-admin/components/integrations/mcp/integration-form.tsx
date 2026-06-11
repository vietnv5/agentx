"use client";

import * as React from "react";
import { Modal, Button, Input, TextArea, TextField, Label } from "@heroui/react";
import { useTranslations } from "next-intl";

interface Integration {
  id: string;
  name: string;
  description?: string;
  transport: "sse" | "stdio" | "http";
  endpoint?: string;
  headers?: any;
  command?: string;
  args?: any;
  env?: any;
  authConfig?: any;
  status: "active" | "inactive" | "error";
  syncError?: string;
  toolDefinitions: Array<{
    id: string;
    toolName: string;
    description?: string;
    inputSchema: any;
    requiresApproval: boolean;
  }>;
}

interface IntegrationFormProps {
  isOpen: boolean;
  initialIntegration: Integration | null;
  onSubmit: (payload: any) => void;
  onCancel: () => void;
}

export function IntegrationForm({
  isOpen,
  initialIntegration,
  onSubmit,
  onCancel,
}: IntegrationFormProps) {
  const t = useTranslations();

  // Form State
  const [formName, setFormName] = React.useState("");
  const [formDesc, setFormDesc] = React.useState("");
  const [formTransport, setFormTransport] = React.useState<"sse" | "stdio" | "http">("stdio");
  const [formEndpoint, setFormEndpoint] = React.useState("");
  const [formHeaders, setFormHeaders] = React.useState("{}");
  const [formCommand, setFormCommand] = React.useState("");
  const [formArgs, setFormArgs] = React.useState("[]");
  const [formEnv, setFormEnv] = React.useState("{}");
  const [formStatus, setFormStatus] = React.useState<
    "active" | "inactive" | "error"
  >("active");

  React.useEffect(() => {
    if (initialIntegration) {
      setFormName(initialIntegration.name);
      setFormDesc(initialIntegration.description || "");
      setFormTransport(initialIntegration.transport);
      setFormEndpoint(initialIntegration.endpoint || "");
      setFormHeaders(JSON.stringify(initialIntegration.headers || {}, null, 2));
      setFormCommand(initialIntegration.command || "");
      setFormArgs(JSON.stringify(initialIntegration.args || [], null, 2));
      setFormEnv(JSON.stringify(initialIntegration.env || {}, null, 2));
      setFormStatus(initialIntegration.status);
    } else {
      setFormName("");
      setFormDesc("");
      setFormTransport("stdio");
      setFormEndpoint("");
      setFormHeaders("{}");
      setFormCommand("");
      setFormArgs("[]");
      setFormEnv("{}");
      setFormStatus("active");
    }
  }, [initialIntegration]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    let parsedHeaders = {};
    let parsedArgs = [];
    let parsedEnv = {};

    const isHttpOrSse = formTransport === "sse" || formTransport === "http";

    try {
      if (isHttpOrSse) {
        parsedHeaders = JSON.parse(formHeaders || "{}");
      } else {
        parsedArgs = JSON.parse(formArgs || "[]");
        parsedEnv = JSON.parse(formEnv || "{}");
      }
    } catch (err) {
      alert(t("integrations.alert.jsonInvalid"));
      return;
    }

    onSubmit({
      name: formName,
      description: formDesc,
      transport: formTransport,
      endpoint: isHttpOrSse ? formEndpoint : null,
      headers: isHttpOrSse ? parsedHeaders : null,
      command: formTransport === "stdio" ? formCommand : null,
      args: formTransport === "stdio" ? parsedArgs : null,
      env: formTransport === "stdio" ? parsedEnv : null,
      status: formStatus,
    });
  };

  const isHttpOrSse = formTransport === "sse" || formTransport === "http";

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && onCancel()} variant="blur">
      <Modal.Container size="3xl" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <form className="w-full" onSubmit={handleSubmit}>
            <Modal.Header className="flex flex-col gap-1 text-lg font-bold">
              {initialIntegration
                ? t("integrations.editor.titleEdit", { name: formName })
                : t("integrations.editor.titleCreate")}
            </Modal.Header>
            <Modal.Body className="pb-6">
              <div className="grid gap-6 md:grid-cols-2">
          {/* Left Side */}
          <div className="space-y-4">
            <TextField isRequired className="w-full" name="name" value={formName} onChange={setFormName}>
              <Label className="text-default-500 text-xs font-semibold mb-1 block">
                {t("integrations.editor.name")}
              </Label>
              <Input
                className="text-foreground"
                placeholder={t("integrations.editor.namePlaceholder")}
              />
            </TextField>

            <TextField className="w-full" name="description" value={formDesc} onChange={setFormDesc}>
              <Label className="text-default-500 text-xs font-semibold mb-1 block">
                {t("integrations.editor.desc")}
              </Label>
              <TextArea
                className="text-foreground"
                placeholder={t("integrations.editor.descPlaceholder")}
                rows={2}
              />
            </TextField>

            <div className="grid gap-4 grid-cols-2">
              <div>
                <span className="text-xs font-semibold text-default-500 block mb-1">
                  {t("integrations.editor.transport")}
                </span>
                <select
                  className="w-full bg-default-100 text-foreground border border-default-200 hover:border-default-300 focus:border-primary rounded-lg p-2.5 text-sm focus:outline-none"
                  value={formTransport}
                  onChange={(e) => setFormTransport(e.target.value as any)}
                >
                  <option value="stdio">
                    {t("integrations.editor.transportStdio")}
                  </option>
                  <option value="sse">
                    {t("integrations.editor.transportSse")}
                  </option>
                  <option value="http">
                    {t("integrations.editor.transportHttp")}
                  </option>
                </select>
              </div>
              <div>
                <span className="text-xs font-semibold text-default-500 block mb-1">
                  {t("integrations.editor.status")}
                </span>
                <select
                  className="w-full bg-default-100 text-foreground border border-default-200 hover:border-default-300 focus:border-primary rounded-lg p-2.5 text-sm focus:outline-none"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                >
                  <option value="active">
                    {t("integrations.editor.statusActive")}
                  </option>
                  <option value="inactive">
                    {t("integrations.editor.statusInactive")}
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Side - Transport Configs */}
          <div className="space-y-4">
            {isHttpOrSse ? (
              <div className="space-y-4">
                <TextField isRequired className="w-full" name="endpoint" value={formEndpoint} onChange={setFormEndpoint}>
                  <Label className="text-default-500 text-xs font-semibold mb-1 block">
                    {formTransport === "sse" ? t("integrations.editor.sseUrl") : t("integrations.editor.httpUrl")}
                  </Label>
                  <Input
                    className="text-foreground"
                    placeholder={formTransport === "sse" ? t("integrations.editor.sseUrlPlaceholder") : t("integrations.editor.httpUrlPlaceholder")}
                  />
                </TextField>
                <TextField className="w-full" name="headers" value={formHeaders} onChange={setFormHeaders}>
                  <Label className="text-default-500 text-xs font-semibold mb-1 block">
                    {t("integrations.editor.headers")}
                  </Label>
                  <TextArea
                    className="text-foreground font-mono text-xs"
                    placeholder={t("integrations.editor.headersPlaceholder")}
                    rows={4}
                  />
                </TextField>
              </div>
            ) : (
              <div className="space-y-4">
                <TextField isRequired className="w-full" name="command" value={formCommand} onChange={setFormCommand}>
                  <Label className="text-default-500 text-xs font-semibold mb-1 block">
                    {t("integrations.editor.command")}
                  </Label>
                  <Input
                    className="text-foreground"
                    placeholder={t("integrations.editor.commandPlaceholder")}
                  />
                </TextField>
                <TextField className="w-full" name="args" value={formArgs} onChange={setFormArgs}>
                  <Label className="text-default-500 text-xs font-semibold mb-1 block">
                    {t("integrations.editor.args")}
                  </Label>
                  <TextArea
                    className="text-foreground font-mono text-xs"
                    placeholder={t("integrations.editor.argsPlaceholder")}
                    rows={3}
                  />
                </TextField>
                <TextField className="w-full" name="env" value={formEnv} onChange={setFormEnv}>
                  <Label className="text-default-500 text-xs font-semibold mb-1 block">
                    {t("integrations.editor.env")}
                  </Label>
                  <TextArea
                    className="text-foreground font-mono text-xs"
                    placeholder={t("integrations.editor.envPlaceholder")}
                    rows={3}
                  />
                </TextField>
              </div>
            )}
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
                {t("integrations.editor.cancel")}
              </Button>
              <Button
                className="cursor-pointer font-bold"
                type="submit"
                variant="primary"
              >
                {t("integrations.editor.save")}
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
