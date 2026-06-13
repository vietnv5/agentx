import * as React from "react";
import { Users, AlertCircle } from "lucide-react";
import { Spinner, toast, Tabs } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { adminService } from "@/src/features/agent-admin/services/admin.service";
import { UserTable } from "./user-table";
import { PermissionMatrix } from "./permission-matrix";
import { UserForm } from "./user-form";
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
  const { t } = useTranslation();
  const [users, setUsers] = React.useState<User[]>([]);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = React.useState<React.Key>("users-tab");

  // Selected Role for Permission Manager
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null);

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

  // Permission Rule CRUD Handlers
  const handleCreatePermission = async (payload: { toolPattern: string; allowed: boolean; isActive: boolean }) => {
    if (!selectedRole) return;
    try {
      await adminService.createToolPermission(selectedRole.id, payload);
      toast.success(t("users.matrix.addSuccess"));
      loadData();
    } catch (err: any) {
      toast.danger(t("users.alert.updatePermFailed"));
      throw err;
    }
  };

  const handleUpdatePermission = async (id: string, payload: { toolPattern?: string; allowed?: boolean; isActive?: boolean }) => {
    try {
      await adminService.updateToolPermission(id, payload);
      toast.success(t("users.matrix.updateSuccess"));
      loadData();
    } catch (err: any) {
      toast.danger(t("users.alert.updatePermFailed"));
      throw err;
    }
  };

  const handleDeletePermission = async (id: string) => {
    try {
      await adminService.deleteToolPermission(id);
      toast.success(t("users.matrix.deleteSuccess"));
      loadData();
    } catch (err: any) {
      toast.danger(t("users.alert.deletePermFailed"));
      throw err;
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

      {/* Tab Navigation */}
      <Tabs selectedKey={activeTab as string} onSelectionChange={setActiveTab} className="w-full">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Users and Roles Control Panel">
            <Tabs.Tab id="users-tab">
              {t("users.tabs.users")}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="roles-tab">
              {t("users.tabs.roles")}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        
        <Tabs.Panel id="users-tab" className="pt-6">
          <UserTable
            roles={roles}
            users={users}
            onChangeRole={handleChangeRole}
            onToggleActive={handleToggleActive}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddClick={handleAddClick}
          />
        </Tabs.Panel>
        
        <Tabs.Panel id="roles-tab" className="pt-6">
          <PermissionMatrix
            roles={roles}
            selectedRole={selectedRole}
            onSelectRole={setSelectedRole}
            onCreatePermission={handleCreatePermission}
            onUpdatePermission={handleUpdatePermission}
            onDeletePermission={handleDeletePermission}
          />
        </Tabs.Panel>
      </Tabs>

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
