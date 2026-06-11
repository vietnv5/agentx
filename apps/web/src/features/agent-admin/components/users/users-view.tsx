"use client";

import * as React from "react";
import { Users, AlertCircle } from "lucide-react";
import { Spinner, toast } from "@heroui/react";
import { useTranslations } from "next-intl";


import { adminService } from "@/src/features/agent-admin/services/admin.service";
import { UserTable } from "./user-table";
import { PermissionMatrix } from "./permission-matrix";
import { UserForm } from "./user-form";
import { ConfirmModal } from "@/src/components/confirm-modal";

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

  // User CRUD Form State
  const [isEditing, setIsEditing] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);

  // Delete Confirm Modal State
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [userToDeleteId, setUserToDeleteId] = React.useState<string | null>(null);

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
      
      // Use functional state updater to avoid selectedRole dependency
      setSelectedRole((current) => {
        if (rolesData.length === 0) return null;
        if (!current) return rolesData[0];
        const updated = rolesData.find((r: Role) => r.id === current.id);
        return updated || rolesData[0];
      });
    } catch (err: any) {
      setError(
        err.response?.data?.message || t("users.alert.loadFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleActive = async (user: User) => {
    try {
      await adminService.updateUser(user.id, {
        isActive: !user.isActive,
      });
      toast.success(t("users.alert.updateStatusSuccess"));
      loadData();
    } catch (err: any) {
      toast.danger(t("users.alert.updateStatusFailed"));
    }
  };

  const handleChangeRole = async (user: User, roleId: string) => {
    try {
      await adminService.updateUser(user.id, {
        roleId,
      });
      toast.success(t("users.alert.updateRoleSuccess"));
      loadData();
    } catch (err: any) {
      toast.danger(t("users.alert.updateRoleFailed"));
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
      toast.success(t("users.alert.updatePermSuccess"));
      loadData();
    } catch (err: any) {
      toast.danger(t("users.alert.updatePermFailed"));
    }
  };

  const handleDeletePermission = async (pattern: string) => {
    if (!selectedRole) return;
    try {
      await adminService.updateRolePermissions(selectedRole.id, {
        toolPattern: pattern,
        allowed: false,
      });
      toast.success(t("users.alert.deletePermSuccess"));
      loadData();
    } catch (err: any) {
      toast.danger(t("users.alert.deletePermFailed"));
    }
  };

  // User CRUD Handlers
  const handleAddClick = () => {
    setEditingUser(null);
    setIsEditing(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditingUser(null);
    setIsEditing(false);
  };

  const handleSubmit = async (payload: any) => {
    try {
      if (editingUser) {
        await adminService.updateUser(editingUser.id, payload);
        toast.success(t("users.alert.updateSuccess"));
      } else {
        await adminService.createUser(payload);
        toast.success(t("users.alert.createSuccess"));
      }
      setIsEditing(false);
      setEditingUser(null);
      loadData();
    } catch (err: any) {
      toast.danger(err.response?.data?.message || (editingUser ? t("users.alert.updateFailed") : t("users.alert.createFailed")));
    }
  };

  const handleDelete = async (userId: string) => {
    setUserToDeleteId(userId);
    setIsDeleteOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDeleteId) return;
    try {
      await adminService.deleteUser(userToDeleteId);
      toast.success(t("users.alert.deleteSuccess"));
      loadData();
    } catch (err: any) {
      toast.danger(err.response?.data?.message || t("users.alert.deleteFailed"));
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
        <p className="text-sm text-default-550">
          {t("users.subtitle")}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/10 bg-red-500/5 p-4 flex gap-3 text-red-400 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* User CRUD Form */}
      <UserForm
        isOpen={isEditing}
        initialUser={editingUser}
        roles={roles}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Table (Left Spanning 2) */}
        <UserTable
          roles={roles}
          users={users}
          onChangeRole={handleChangeRole}
          onToggleActive={handleToggleActive}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddClick={handleAddClick}
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

      {/* Delete User Confirm Modal */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title={t("users.delete")}
        description={t("users.confirm.delete")}
        onConfirm={confirmDeleteUser}
      />
    </div>
  );
}
