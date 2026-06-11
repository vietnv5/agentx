"use client";

import * as React from "react";
import { Modal, Button, Input, Checkbox, TextField, Label } from "@heroui/react";
import { useTranslations } from "next-intl";

interface Role {
  id: string;
  name: "ADMIN" | "STAFF";
  description?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  roleId: string;
  isActive: boolean;
}

interface UserFormProps {
  isOpen: boolean;
  initialUser: User | null;
  roles: Role[];
  onSubmit: (payload: any) => Promise<void>;
  onCancel: () => void;
}

export function UserForm({
  isOpen,
  initialUser,
  roles,
  onSubmit,
  onCancel,
}: UserFormProps) {
  const t = useTranslations();

  const [formName, setFormName] = React.useState("");
  const [formEmail, setFormEmail] = React.useState("");
  const [formPassword, setFormPassword] = React.useState("");
  const [formRoleId, setFormRoleId] = React.useState("");
  const [formIsActive, setFormIsActive] = React.useState(true);

  React.useEffect(() => {
    if (initialUser) {
      setFormName(initialUser.name);
      setFormEmail(initialUser.email);
      setFormPassword(""); // Always blank initially on edit
      setFormRoleId(initialUser.roleId || initialUser.role?.id || "");
      setFormIsActive(initialUser.isActive);
    } else {
      setFormName("");
      setFormEmail("");
      setFormPassword("");
      setFormRoleId(roles[0]?.id || "");
      setFormIsActive(true);
    }
  }, [initialUser, roles]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;
    if (!initialUser && !formPassword.trim()) return; // Password is required on create

    const payload: any = {
      name: formName.trim(),
      email: formEmail.trim(),
      roleId: formRoleId,
      isActive: formIsActive,
    };

    if (formPassword.trim()) {
      payload.password = formPassword.trim();
    }

    onSubmit(payload);
  };

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && onCancel()} variant="blur">
      <Modal.Container size="2xl" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <form className="w-full" onSubmit={handleSubmit}>
            <Modal.Header className="flex flex-col gap-1 text-base font-bold">
              {initialUser
                ? t("users.editor.titleEdit", { name: formName })
                : t("users.editor.titleCreate")}
            </Modal.Header>
            <Modal.Body className="pb-6">
              <div className="grid gap-6 md:grid-cols-2">
          {/* Column 1 */}
          <div className="space-y-4">
            <TextField isRequired className="w-full" name="name" value={formName} onChange={setFormName}>
              <Label className="text-default-500 text-xs font-semibold mb-1 block">
                {t("users.editor.name")}
              </Label>
              <Input
                className="text-foreground"
                placeholder={t("users.editor.namePlaceholder")}
              />
            </TextField>

            <TextField isRequired className="w-full" name="email" value={formEmail} onChange={setFormEmail}>
              <Label className="text-default-500 text-xs font-semibold mb-1 block">
                {t("users.editor.email")}
              </Label>
              <Input
                className="text-foreground"
                type="email"
                placeholder={t("users.editor.emailPlaceholder")}
              />
            </TextField>
          </div>

          {/* Column 2 */}
          <div className="space-y-4">
            <TextField
              isRequired={!initialUser}
              className="w-full"
              name="password"
              value={formPassword}
              onChange={setFormPassword}
            >
              <Label className="text-default-500 text-xs font-semibold mb-1 block">
                {t("users.editor.password")}
              </Label>
              <Input
                className="text-foreground"
                type="password"
                placeholder={
                  initialUser
                    ? t("users.editor.passwordPlaceholderEdit")
                    : t("users.editor.passwordPlaceholderCreate")
                }
              />
            </TextField>

            <div className="grid gap-4 grid-cols-2">
              <div>
                <span className="text-xs font-semibold text-default-500 block mb-1">
                  {t("users.editor.role")}
                </span>
                <select
                  className="w-full bg-default-100 text-foreground border border-default-250 hover:border-default-300 focus:border-primary rounded-lg p-2.5 text-xs focus:outline-none"
                  value={formRoleId}
                  onChange={(e) => setFormRoleId(e.target.value)}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-xs font-semibold text-default-500 block mb-1">
                  {t("users.editor.active")}
                </span>
                <div className="flex h-[42px] items-center">
                  <Checkbox
                    isSelected={formIsActive}
                    onChange={setFormIsActive}
                  />
                </div>
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
                {t("users.editor.cancel")}
              </Button>
              <Button
                className="cursor-pointer font-bold"
                type="submit"
                variant="primary"
              >
                {t("users.editor.save")}
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
