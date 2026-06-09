"use client";

import * as React from "react";
import { Users, UserCheck, UserX } from "lucide-react";
import {
  Card,
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
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
}

export function UserTable({
  users,
  roles,
  onChangeRole,
  onToggleActive,
}: UserTableProps) {
  const t = useTranslations();

  return (
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
                    onChange={(e) => onChangeRole(u, e.target.value)}
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
                    {u.isActive
                      ? t("users.list.statusActive")
                      : t("users.list.statusLocked")}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    className="cursor-pointer"
                    size="sm"
                    variant={u.isActive ? "danger" : "primary"}
                    onClick={() => onToggleActive(u)}
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
  );
}
