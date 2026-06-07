"use client";

import * as React from "react";
import {
  Users,
  Shield,
  UserCheck,
  UserX,
  Lock,
  Unlock,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  Button,
  Spinner,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  TextField,
  Label,
} from "@heroui/react";
import { useTranslations } from "next-intl";

import { adminService } from "@/src/features/agent-admin/services/admin.service";

interface Role {
  id: string;
  name: "ADMIN" | "STAFF";
  description?: string;
  toolPermissions: Array<{ id: string; toolPattern: string; allowed: boolean }>;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  roleId: string;
  isActive: boolean;
  createdAt: string;
}

export function UsersView() {
  const t = useTranslations();
  const [users, setUsers] = React.useState<User[]>([]);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Permission Form State
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null);
  const [newPattern, setNewPattern] = React.useState("");
  const [newAllowed, setNewAllowed] = React.useState(true);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersData, rolesData] = await Promise.all([
        adminService.getUsers(),
        adminService.getRoles(),
      ]);

      setUsers(usersData);
      setRoles(rolesData);
      // Select the first role by default for matrix config
      if (rolesData.length > 0 && !selectedRole) {
        setSelectedRole(rolesData[0]);
      } else if (selectedRole) {
        const updated = rolesData.find((r: Role) => r.id === selectedRole.id);

        setSelectedRole(updated || rolesData[0]);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || t("users.alert.loadFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [selectedRole, t]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleActive = async (user: User) => {
    try {
      await adminService.updateUser(user.id, {
        isActive: !user.isActive,
      });
      loadData();
    } catch (err: any) {
      alert(t("users.alert.updateStatusFailed"));
    }
  };

  const handleChangeRole = async (user: User, roleId: string) => {
    try {
      await adminService.updateUser(user.id, {
        roleId,
      });
      loadData();
    } catch (err: any) {
      alert(t("users.alert.updateRoleFailed"));
    }
  };

  const handleAddPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !newPattern.trim()) return;

    try {
      await adminService.updateRolePermissions(selectedRole.id, {
        toolPattern: newPattern.trim(),
        allowed: newAllowed,
      });
      setNewPattern("");
      loadData();
    } catch (err: any) {
      alert(t("users.alert.updatePermFailed"));
    }
  };

  const handleDeletePermission = async (pattern: string) => {
    if (!selectedRole) return;
    try {
      // Vì API post cũng hoạt động như upsert, ta chỉ cần gửi allowed: false hoặc ngược lại
      // Để thực sự xóa hoặc vô hiệu hóa, gán allowed = false
      await adminService.updateRolePermissions(selectedRole.id, {
        toolPattern: pattern,
        allowed: false,
      });
      loadData();
    } catch (err: any) {
      alert(t("users.alert.deletePermFailed"));
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-3 items-center justify-center bg-background">
        <Spinner color="success" size="lg" />
        <span className="text-default-500 text-sm">
          {t("users.loading")}
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 md:p-8 space-y-8 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
          {t("users.title")}
        </h1>
        <p className="text-sm text-default-500">
          {t("users.subtitle")}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/10 bg-red-500/5 p-4 flex gap-3 text-red-400 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Table (Left Spanning 2) */}
        <Card className="lg:col-span-2 bg-content1 border border-default-150 p-6 rounded-xl space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            {t("users.list.title")}
          </h2>

          <div className="overflow-x-auto">
            <Table aria-label={t("users.list.tableAriaLabel")} className="w-full">
              <TableHeader>
                <TableColumn className="bg-default-100 text-foreground font-bold">
                  {t("users.list.colName")}
                </TableColumn>
                <TableColumn className="bg-default-100 text-foreground font-bold">
                  {t("users.list.colEmail")}
                </TableColumn>
                <TableColumn className="bg-default-100 text-foreground font-bold">
                  {t("users.list.colRole")}
                </TableColumn>
                <TableColumn className="bg-default-100 text-foreground font-bold text-center">
                  {t("users.list.colStatus")}
                </TableColumn>
                <TableColumn className="bg-default-100 text-foreground font-bold text-right">
                  {t("users.list.colActions")}
                </TableColumn>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow
                    key={u.id}
                    className="border-b border-default-100 hover:bg-default-50/50"
                  >
                    <TableCell className="text-foreground font-semibold">
                      {u.name}
                    </TableCell>
                    <TableCell className="text-default-550">
                      {u.email}
                    </TableCell>
                    <TableCell className="text-default-600">
                      <select
                        className="bg-default-100 text-foreground border border-default-250 rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
                        value={u.role.id}
                        onChange={(e) => handleChangeRole(u, e.target.value)}
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          u.isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {u.isActive ? t("users.list.statusActive") : t("users.list.statusLocked")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        className="cursor-pointer"
                        size="sm"
                        variant={u.isActive ? "danger" : "primary"}
                        onClick={() => handleToggleActive(u)}
                      >
                        {u.isActive ? (
                          <UserX className="h-3.5 w-3.5" />
                        ) : (
                          <UserCheck className="h-3.5 w-3.5" />
                        )}
                        {u.isActive ? t("users.list.lock") : t("users.list.unlock")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Permission Matrix (Right Spanning 1) */}
        <Card className="bg-content1 border border-default-150 p-6 rounded-xl space-y-4 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-500 dark:text-purple-400" />
              {t("users.matrix.title")}
            </h2>
            <p className="text-[10px] text-default-450">
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

                if (found) setSelectedRole(found);
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
                    onClick={() => handleDeletePermission(perm.toolPattern)}
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
            onSubmit={handleAddPermission}
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-default-450 block">
              {t("users.matrix.newRule")}
            </span>
            <TextField isRequired className="w-full" name="toolPattern">
              <Label className="text-default-500 text-xs font-semibold mb-1 block">
                {t("users.matrix.pattern")}
              </Label>
              <Input
                className="text-foreground"
                placeholder={t("users.matrix.patternPlaceholder")}
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value)}
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
                  onChange={(e) => setNewAllowed(e.target.value === "true")}
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
      </div>
    </div>
  );
}
