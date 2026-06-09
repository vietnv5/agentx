"use client";

import * as React from "react";
import { Shield, Lock, Unlock, Trash2, Plus } from "lucide-react";
import { Card, Button, Input, TextField, Label } from "@heroui/react";
import { useTranslations } from "next-intl";

interface Role {
  id: string;
  name: "ADMIN" | "STAFF";
  description?: string;
  toolPermissions: Array<{ id: string; toolPattern: string; allowed: boolean }>;
}

interface PermissionMatrixProps {
  roles: Role[];
  selectedRole: Role | null;
  onSelectRole: (role: Role) => void;
  newPattern: string;
  onChangePattern: (val: string) => void;
  newAllowed: boolean;
  onChangeAllowed: (val: boolean) => void;
  onAddPermission: (e: React.FormEvent) => void;
  onDeletePermission: (pattern: string) => void;
}

export function PermissionMatrix({
  roles,
  selectedRole,
  onSelectRole,
  newPattern,
  onChangePattern,
  newAllowed,
  onChangeAllowed,
  onAddPermission,
  onDeletePermission,
}: PermissionMatrixProps) {
  const t = useTranslations();

  return (
    <Card className="bg-content1 border border-default-150 p-6 rounded-xl space-y-4 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Shield className="h-5 w-5 text-purple-500 dark:text-purple-400" />
          {t("users.matrix.title")}
        </h2>
        <p className="text-[10px] text-default-455">
          {t("users.matrix.subtitle")}
        </p>
      </div>

      {/* Select Role Selector */}
      <div>
        <span className="text-xs font-semibold text-default-555 block mb-1">
          {t("users.matrix.roleConfig")}
        </span>
        <select
          className="w-full bg-default-100 text-foreground border border-default-200 hover:border-default-300 rounded-lg p-2 text-sm focus:outline-none"
          value={selectedRole?.id || ""}
          onChange={(e) => {
            const found = roles.find((r) => r.id === e.target.value);
            if (found) onSelectRole(found);
          }}
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} - ({r.description || "No desc"})
            </option>
          ))}
        </select>
      </div>

      {/* List existing permissions patterns */}
      <div className="space-y-2 pt-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-default-450 block">
          {t("users.matrix.currentRules")}
        </span>
        <div className="space-y-2 max-h-[200px] overflow-y-auto border border-default-200 p-2.5 rounded-lg bg-default-50">
          {selectedRole?.toolPermissions?.map((perm) => (
            <div
              key={perm.id}
              className="flex items-center justify-between p-2 rounded bg-default-100 border border-default-200 text-xs"
            >
              <div className="flex items-center gap-2">
                {perm.allowed ? (
                  <Unlock className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                )}
                <span className="font-mono text-foreground font-semibold">
                  {perm.toolPattern}
                </span>
              </div>
              <button
                className="text-default-400 hover:text-red-500 transition-colors cursor-pointer"
                type="button"
                onClick={() => onDeletePermission(perm.toolPattern)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {(!selectedRole?.toolPermissions ||
            selectedRole.toolPermissions.length === 0) && (
            <p className="text-xs text-default-400 italic text-center py-4">
              {t("users.matrix.emptyRules")}
            </p>
          )}
        </div>
      </div>

      {/* Add new permission pattern rule */}
      <form
        className="border-t border-default-150 pt-4 space-y-3"
        onSubmit={onAddPermission}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-default-450 block">
          {t("users.matrix.newRule")}
        </span>
        <TextField
          isRequired
          className="w-full"
          name="toolPattern"
          value={newPattern}
          onChange={onChangePattern}
        >
          <Label className="text-default-500 text-xs font-semibold mb-1 block">
            {t("users.matrix.pattern")}
          </Label>
          <Input
            className="text-foreground"
            placeholder={t("users.matrix.patternPlaceholder")}
          />
        </TextField>

        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-xs font-semibold text-default-500 block mb-1">
              {t("users.matrix.allowed")}
            </span>
            <select
              className="bg-default-100 text-foreground border border-default-200 focus:border-primary rounded px-2.5 py-1 text-xs focus:outline-none"
              value={newAllowed ? "true" : "false"}
              onChange={(e) => onChangeAllowed(e.target.value === "true")}
            >
              <option value="true">{t("users.matrix.allow")}</option>
              <option value="false">{t("users.matrix.deny")}</option>
            </select>
          </div>
          <Button size="sm" type="submit" variant="primary">
            <Plus className="h-3.5 w-3.5" />
            {t("users.matrix.addBtn")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
