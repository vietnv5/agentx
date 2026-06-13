import * as React from "react";
import { Shield, Lock, Unlock, Trash2, Plus, Edit } from "lucide-react";
import { Card, Button, Table, Modal, Switch, TextField, Input, Label } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { ConfirmModal } from "@/src/components/confirm-modal";

interface PermissionRule {
  id: string;
  toolPattern: string;
  allowed: boolean;
  isActive: boolean;
}

interface Role {
  id: string;
  name: "ADMIN" | "STAFF";
  description?: string;
  toolPermissions: PermissionRule[];
}

interface PermissionMatrixProps {
  roles: Role[];
  selectedRole: Role | null;
  onSelectRole: (role: Role) => void;
  onCreatePermission: (payload: { toolPattern: string; allowed: boolean; isActive: boolean }) => Promise<void>;
  onUpdatePermission: (id: string, payload: { toolPattern?: string; allowed?: boolean; isActive?: boolean }) => Promise<void>;
  onDeletePermission: (id: string) => Promise<void>;
}

export function PermissionMatrix({
  roles,
  selectedRole,
  onSelectRole,
  onCreatePermission,
  onUpdatePermission,
  onDeletePermission,
}: PermissionMatrixProps) {
  const { t } = useTranslation();

  // Dialog & Modals State
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<PermissionRule | null>(null);
  const [ruleToDelete, setRuleToDelete] = React.useState<PermissionRule | null>(null);

  // Form Fields
  const [formPattern, setFormPattern] = React.useState("");
  const [formAllowed, setFormAllowed] = React.useState(true);
  const [formIsActive, setFormIsActive] = React.useState(true);

  // Open Form modal for creation
  const handleOpenCreate = () => {
    setEditingRule(null);
    setFormPattern("");
    setFormAllowed(true);
    setFormIsActive(true);
    setIsFormOpen(true);
  };

  // Open Form modal for editing
  const handleOpenEdit = (rule: PermissionRule) => {
    setEditingRule(rule);
    setFormPattern(rule.toolPattern);
    setFormAllowed(rule.allowed);
    setFormIsActive(rule.isActive);
    setIsFormOpen(true);
  };

  // Open Delete Confirm modal
  const handleOpenDelete = (rule: PermissionRule) => {
    setRuleToDelete(rule);
    setIsDeleteOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPattern.trim()) return;

    try {
      if (editingRule) {
        await onUpdatePermission(editingRule.id, {
          toolPattern: formPattern.trim(),
          allowed: formAllowed,
          isActive: formIsActive,
        });
      } else {
        await onCreatePermission({
          toolPattern: formPattern.trim(),
          allowed: formAllowed,
          isActive: formIsActive,
        });
      }
      setIsFormOpen(false);
    } catch (err) {
      // error is handled in parent view
    }
  };

  const handleConfirmDelete = async () => {
    if (!ruleToDelete) return;
    await onDeletePermission(ruleToDelete.id);
    setIsDeleteOpen(false);
    setRuleToDelete(null);
  };

  const handleToggleActive = async (rule: PermissionRule) => {
    await onUpdatePermission(rule.id, {
      isActive: !rule.isActive,
    });
  };

  const handleToggleAllowed = async (rule: PermissionRule) => {
    await onUpdatePermission(rule.id, {
      allowed: !rule.allowed,
    });
  };

  return (
    <Card className="bg-content1 border border-default-150 p-6 rounded-xl space-y-6 shadow-sm font-sans w-full">
      {/* Header and Add Button */}
      <div className="flex flex-row items-center justify-between border-b border-default-150 pb-3">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-550 dark:text-purple-400" />
            {t("users.matrix.title")}
          </h2>
          <p className="text-[11px] text-default-450">
            {t("users.matrix.subtitle")}
          </p>
        </div>
        <Button
          className="cursor-pointer"
          size="sm"
          variant="primary"
          onClick={handleOpenCreate}
        >
          <Plus className="h-4 w-4" />
          {t("users.matrix.newRule")}
        </Button>
      </div>

      {/* Role Selection Dropdown */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <label className="text-xs font-bold text-default-550 shrink-0">
          {t("users.matrix.roleConfig")}
        </label>
        <select
          className="bg-default-100 text-foreground border border-default-250 hover:border-default-300 rounded-lg p-2.5 text-xs focus:outline-none focus:border-primary max-w-xs w-full"
          value={selectedRole?.id || ""}
          onChange={(e) => {
            const found = roles.find((r) => r.id === e.target.value);
            if (found) onSelectRole(found);
          }}
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} - ({r.description || "No description"})
            </option>
          ))}
        </select>
      </div>

      {/* Rules Table */}
      <div className="overflow-x-auto w-full">
        <Table aria-label={t("users.matrix.currentRules")} className="w-full">
          <Table.ScrollContainer>
            <Table.Content className="w-full">
              <Table.Header>
                <Table.Column isRowHeader className="bg-default-100 text-foreground font-bold">
                  {t("users.matrix.colPattern")}
                </Table.Column>
                <Table.Column className="bg-default-100 text-foreground font-bold text-center">
                  {t("users.matrix.colAllowed")}
                </Table.Column>
                <Table.Column className="bg-default-100 text-foreground font-bold text-center">
                  {t("users.matrix.colStatus")}
                </Table.Column>
                <Table.Column className="bg-default-100 text-foreground font-bold text-right">
                  {t("users.matrix.colActions")}
                </Table.Column>
              </Table.Header>
              <Table.Body
                renderEmptyState={() => (
                  <div className="text-xs text-default-400 italic text-center py-8">
                    {t("users.matrix.emptyRules")}
                  </div>
                )}
              >
                {(selectedRole?.toolPermissions || []).map((perm) => (
                  <Table.Row
                    key={perm.id}
                    className="border-b border-default-100 hover:bg-default-50/50"
                  >
                    <Table.Cell className="font-mono text-xs text-foreground font-semibold">
                      {perm.toolPattern}
                    </Table.Cell>
                    <Table.Cell className="text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleAllowed(perm)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold cursor-pointer hover:bg-opacity-80 transition-colors focus:outline-none ${
                          perm.allowed
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                            : "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
                        }`}
                        title={t("users.matrix.allowed")}
                      >
                        {perm.allowed ? (
                          <>
                            <Unlock className="h-3 w-3" />
                            {t("users.matrix.allow")}
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3" />
                            {t("users.matrix.deny")}
                          </>
                        )}
                      </button>
                    </Table.Cell>
                    <Table.Cell className="text-center">
                      <div className="flex justify-center items-center">
                        <Switch isSelected={perm.isActive} onChange={() => handleToggleActive(perm)}>
                          <Switch.Control>
                            <Switch.Thumb />
                          </Switch.Control>
                        </Switch>
                      </div>
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        <Button
                          isIconOnly
                          className="cursor-pointer"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(perm)}
                        >
                          <Edit className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button
                          isIconOnly
                          className="cursor-pointer"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDelete(perm)}
                        >
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </div>

      {/* Add / Edit Modal Dialog */}
      <Modal.Backdrop isOpen={isFormOpen} onOpenChange={(open) => !open && setIsFormOpen(false)} variant="blur">
        <Modal.Container size="md">
          <Modal.Dialog className="w-full bg-content1 border border-default-150 rounded-xl shadow-lg p-4 h-auto">
            <Modal.CloseTrigger />
            <form onSubmit={handleFormSubmit}>
              <Modal.Header className="flex flex-col gap-1 text-base font-bold pb-2 border-b border-default-150">
                {editingRule ? t("users.matrix.editRule") : t("users.matrix.newRule")}
              </Modal.Header>
              <Modal.Body className="py-4 space-y-4">
                <TextField isRequired className="w-full" name="toolPattern" value={formPattern} onChange={setFormPattern}>
                  <Label className="text-default-500 text-xs font-semibold mb-1 block">
                    {t("users.matrix.pattern")}
                  </Label>
                  <Input
                    className="text-foreground"
                    placeholder={t("users.matrix.patternPlaceholder")}
                  />
                </TextField>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-semibold text-default-500 block mb-1">
                      {t("users.matrix.allowed")}
                    </span>
                    <select
                      className="w-full bg-default-100 text-foreground border border-default-250 hover:border-default-300 rounded-lg p-2.5 text-xs focus:outline-none focus:border-primary"
                      value={formAllowed ? "true" : "false"}
                      onChange={(e) => setFormAllowed(e.target.value === "true")}
                    >
                      <option value="true">{t("users.matrix.allow")}</option>
                      <option value="false">{t("users.matrix.deny")}</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-default-500 block mb-1">
                      {t("users.matrix.colStatus")}
                    </span>
                    <div className="flex h-[42px] items-center">
                      <Switch isSelected={formIsActive} onChange={setFormIsActive}>
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch>
                      <span className="text-xs text-default-500 ml-2">
                        {formIsActive ? t("users.matrix.statusActive") : t("users.matrix.statusDisabled")}
                      </span>
                    </div>
                  </div>
                </div>
              </Modal.Body>
              <Modal.Footer className="pt-3 border-t border-default-100">
                <Button
                  className="cursor-pointer border border-default-250 text-default-500 hover:bg-default-100"
                  type="button"
                  variant="ghost"
                  onPress={() => setIsFormOpen(false)}
                >
                  {t("users.editor.cancel")}
                </Button>
                <Button
                  className="cursor-pointer font-bold"
                  type="submit"
                  variant="primary"
                >
                  {editingRule ? t("users.matrix.editBtn") : t("users.matrix.addBtn")}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* Delete Rule Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title={t("users.delete")}
        description={t("users.matrix.deleteConfirm")}
        onConfirm={handleConfirmDelete}
      />
    </Card>
  );
}
