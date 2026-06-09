"use client";

import * as React from "react";
import { Users, AlertCircle } from "lucide-react";
import { Spinner } from "@heroui/react";
import { useTranslations } from "next-intl";


import { adminService } from "@/src/features/agent-admin/services/admin.service";
import { UserTable } from "./user-table";
import { PermissionMatrix } from "./permission-matrix";

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
        <UserTable
          roles={roles}
          users={users}
          onChangeRole={handleChangeRole}
          onToggleActive={handleToggleActive}
        />

        {/* Permission Matrix (Right Spanning 1) */}
        <PermissionMatrix
          newAllowed={newAllowed}
          newPattern={newPattern}
          roles={roles}
          selectedRole={selectedRole}
          onAddPermission={handleAddPermission}
          onChangeAllowed={setNewAllowed}
          onChangePattern={setNewPattern}
          onDeletePermission={handleDeletePermission}
          onSelectRole={setSelectedRole}
        />
      </div>
    </div>
  );
}
