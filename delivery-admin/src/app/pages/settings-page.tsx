import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/data-table/data-table";
import { ErrorState } from "@/components/feedback/error-state";
import { TableSkeleton } from "@/components/feedback/skeletons";
import { StatusBadge } from "@/components/forms/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { PermissionGuard } from "@/components/layout/permission-guard";
import { Checkbox } from "@/components/ui/checkbox";
import { SectionCard } from "@/components/ui/card";
import { roleLabels, rolePermissions } from "@/constants/roles";
import { formatDateTime } from "@/lib/format";
import { queryKeys } from "@/services/query-keys";
import { settingsService } from "@/services/settings-service";
import type { AdminUser, AuditLog, Permission } from "@/types";

export function SettingsPage() {
  const adminUsersQuery = useQuery({
    queryKey: queryKeys.settings.adminUsers,
    queryFn: settingsService.listAdminUsers
  });
  const auditLogsQuery = useQuery({
    queryKey: queryKeys.settings.auditLogs,
    queryFn: settingsService.listAuditLogs
  });

  const adminColumns = useMemo<ColumnDef<AdminUser>[]>(
    () => [
      {
        header: "Admin",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        )
      },
      { header: "Role", cell: ({ row }) => roleLabels[row.original.role] },
      { header: "Workspace", accessorKey: "workspaceScope" },
      { header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { header: "Last active", cell: ({ row }) => formatDateTime(row.original.lastActiveAt) }
    ],
    []
  );
  const auditColumns = useMemo<ColumnDef<AuditLog>[]>(
    () => [
      { header: "Action", accessorKey: "action" },
      { header: "Actor", accessorKey: "actorName" },
      { header: "Entity", cell: ({ row }) => `${row.original.entityType}:${row.original.entityId}` },
      { header: "Timestamp", cell: ({ row }) => formatDateTime(row.original.timestamp) },
      { header: "Note", accessorKey: "note" }
    ],
    []
  );

  const permissionColumns = useMemo(() => {
    const samplePermissions: Permission[] = [
      "orders:view",
      "orders:assign",
      "orders:refund",
      "dispatch:manage",
      "support:manage",
      "finance:view",
      "settings:manage"
    ];

    return samplePermissions;
  }, []);

  if (adminUsersQuery.isError || auditLogsQuery.isError) {
    return <ErrorState description="Settings data could not be loaded." title="Settings unavailable" />;
  }

  return (
    <PermissionGuard permission="settings:view">
      <div className="space-y-6">
        <PageHeader
          subtitle="Admin users, roles, permission visibility, workspace defaults, notifications, and audit history."
          title="Settings and access control"
        />

        {adminUsersQuery.isLoading || auditLogsQuery.isLoading || !adminUsersQuery.data || !auditLogsQuery.data ? (
          <TableSkeleton rows={8} />
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
              <DataTable columns={adminColumns} data={adminUsersQuery.data} title="Admin users" />
              <SectionCard description="Example role-to-permission rendering used by guards and action visibility." title="Roles and permissions">
                <div className="space-y-4 overflow-x-auto">
                  {Object.entries(roleLabels).map(([role, label]) => (
                    <div key={role} className="rounded-xl border border-border p-3">
                      <p className="text-sm font-medium">{label}</p>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {permissionColumns.map((permission) => (
                          <label key={permission} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Checkbox checked={rolePermissions[role as keyof typeof rolePermissions].includes(permission)} readOnly />
                            {permission}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.8fr,1.2fr]">
              <SectionCard description="Workspace and notification preferences examples." title="Workspace settings">
                <div className="space-y-4 text-sm">
                  <label className="flex items-center gap-3">
                    <Checkbox defaultChecked readOnly />
                    Route critical dispatch alerts to on-duty operations managers
                  </label>
                  <label className="flex items-center gap-3">
                    <Checkbox defaultChecked readOnly />
                    Require confirmation before destructive order actions
                  </label>
                  <label className="flex items-center gap-3">
                    <Checkbox defaultChecked readOnly />
                    Enable dark mode preference sync across sessions
                  </label>
                  <label className="flex items-center gap-3">
                    <Checkbox readOnly />
                    Auto-resolve low-priority payment tickets after webhook recovery
                  </label>
                </div>
              </SectionCard>

              <DataTable columns={auditColumns} data={auditLogsQuery.data} title="Audit log" />
            </div>
          </>
        )}
      </div>
    </PermissionGuard>
  );
}
