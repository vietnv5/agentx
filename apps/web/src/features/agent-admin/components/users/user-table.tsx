"use client";

import * as React from "react";
import { Users, UserCheck, UserX, Plus, Edit, Trash } from "lucide-react";
import {
  Card,
  Button,
  Table,
} from "@heroui/react";
import { useTranslations } from "next-intl";

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

interface UserTableProps {
  users: User[];
  roles: Role[];
  onChangeRole: (user: User, roleId: string) => Promise<void>;
  onToggleActive: (user: User) => Promise<void>;
  onEdit: (user: User) => void;
  onDelete: (userId: string) => Promise<void>;
  onAddClick: () => void;
}

export function UserTable({
  users,
  roles,
  onChangeRole,
  onToggleActive,
  onEdit,
  onDelete,
  onAddClick,
}: UserTableProps) {
  const t = useTranslations();

  return (
    <Card className="lg:col-span-2 bg-content1 border border-default-150 p-6 rounded-xl space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-default-150 pb-2">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
          {t("users.list.title")}
        </h2>
        <Button
          className="cursor-pointer"
          size="sm"
          variant="primary"
          onClick={onAddClick}
        >
          <Plus className="h-4 w-4" />
          {t("users.add")}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table aria-label={t("users.list.tableAriaLabel")} className="w-full">
          <Table.ScrollContainer>
            <Table.Content className="w-full">
              <Table.Header>
                <Table.Column isRowHeader className="bg-default-100 text-foreground font-bold">
                  {t("users.list.colName")}
                </Table.Column>
                <Table.Column className="bg-default-100 text-foreground font-bold">
                  {t("users.list.colEmail")}
                </Table.Column>
                <Table.Column className="bg-default-100 text-foreground font-bold">
                  {t("users.list.colRole")}
                </Table.Column>
                <Table.Column className="bg-default-100 text-foreground font-bold text-center">
                  {t("users.list.colStatus")}
                </Table.Column>
                <Table.Column className="bg-default-100 text-foreground font-bold text-right">
                  {t("users.list.colActions")}
                </Table.Column>
              </Table.Header>
              <Table.Body
                renderEmptyState={() => (
                  <div className="text-default-400 italic text-center py-6">
                    {t("users.list.empty")}
                  </div>
                )}
              >
                {users.map((u) => (
                  <Table.Row
                    key={u.id}
                    className="border-b border-default-100 hover:bg-default-50/50"
                  >
                    <Table.Cell className="text-foreground font-semibold">
                      {u.name}
                    </Table.Cell>
                    <Table.Cell className="text-default-550">
                      {u.email}
                    </Table.Cell>
                    <Table.Cell className="text-default-600">
                      <select
                        className="bg-default-100 text-foreground border border-default-250 rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
                        value={u.role.id || u.roleId}
                        onChange={(e) => onChangeRole(u, e.target.value)}
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </Table.Cell>
                    <Table.Cell className="text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          u.isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {u.isActive
                          ? t("users.list.statusActive")
                          : t("users.list.statusLocked")}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        <Button
                          isIconOnly
                          className="cursor-pointer"
                          size="sm"
                          variant="ghost"
                          aria-label={t("users.edit")}
                          onClick={() => onEdit(u)}
                        >
                          <Edit className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button
                          isIconOnly
                          className="cursor-pointer"
                          size="sm"
                          variant="ghost"
                          aria-label={u.isActive ? t("users.list.lock") : t("users.list.unlock")}
                          onClick={() => onToggleActive(u)}
                        >
                          {u.isActive ? (
                            <UserX className="h-4 w-4 text-warning" />
                          ) : (
                            <UserCheck className="h-4 w-4 text-success" />
                          )}
                        </Button>
                        <Button
                          isIconOnly
                          className="cursor-pointer"
                          size="sm"
                          variant="ghost"
                          aria-label={t("users.delete")}
                          onClick={() => onDelete(u.id)}
                        >
                          <Trash className="h-4 w-4 text-danger" />
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
    </Card>
  );
}
