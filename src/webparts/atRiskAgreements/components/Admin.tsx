import * as React from "react";
import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Stack, Tab, Tabs, Typography } from "@mui/material";
import { DataSource } from "../data/ds";
import { IAppUserItem, IConfigItem, ILobItem, IOgItem, IEntityItem } from "../data/props";
import RefreshIcon from "@mui/icons-material/Refresh";
import { formatError } from "../services/utils";
import { UsersAdminPanel } from "./admin/userAdminPanel";
import { ApproversAdminPanel } from "./admin/approversAdminPanel";
import { WebPartContext } from "@microsoft/sp-webpart-base";

type AdminTabKey = "users" | "approvers";

interface AdminModuleProps {
  context: WebPartContext;
}

const Admin: React.FC<AdminModuleProps> = ({ context }) => {

  if (!DataSource.isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">You do not have access to Admin settings.</Alert>
      </Box>
    );
  }

  const [tab, setTab] = useState<AdminTabKey>("users");

  // Users are admin-only; load on Admin page
  const [usersLoading, setUsersLoading] = useState<boolean>(false);
  const [usersError, setUsersError] = useState<string>("");
  const [users, setUsers] = useState<IAppUserItem[]>([]);

  // Approver data is already in DataSource.init(); keep a local snapshot to re-render on save/refresh
  const [config, setConfig] = useState<IConfigItem[]>([]);
  const [lobs, setLobs] = useState<ILobItem[]>([]);
  const [ogs, setOgs] = useState<IOgItem[]>([]);
  const [entities, setEntities] = useState<IEntityItem[]>([]);
  const [lookupsError, setLookupsError] = useState<string>("");

  const loadUsers = async (): Promise<void> => {
    setUsersLoading(true);
    setUsersError("");
    try {
      const u = await DataSource.getAppUsers();
      setUsers(u);
    } catch (e) {
      setUsersError(`Failed to load users: ${formatError(e)}`);
    } finally {
      setUsersLoading(false);
    }
  };

  const syncLookupsFromCache = (): void => {
    setConfig(DataSource.Config ?? []);
    setLobs(DataSource.LOBs ?? []);
    setOgs(DataSource.OGs ?? []);
    setEntities(DataSource.Entities ?? []);
  };

  const refreshLookups = async (): Promise<void> => {
    setLookupsError("");
    try {
      // refresh from server (safe even if already loaded)
      await Promise.all([
        DataSource.getConfig(),
        DataSource.getLOBs(),
        DataSource.getOGs(),
        DataSource.getEntities()
      ]);

      syncLookupsFromCache();
    } catch (e) {
      setLookupsError(`Failed to refresh approver lookups: ${formatError(e)}`);
    }
  };

  const handleRefreshClick = async (): Promise<void> => {
    if (tab === "users") {
      await loadUsers();
    } else {
      await refreshLookups();
    }
  };

  useEffect(() => {
    (async () => {
      await loadUsers();
      // these should already be loaded, but syncing ensures render is correct
      syncLookupsFromCache();
    })().catch((e) => {
      // This is a safety net; individual loaders already catch
      console.error("Admin init failed", e);
    });
  }, []);

  return (
    <Box sx={{ p: 2, width: "100%" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Admin Panel</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage users and default approvers
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefreshClick}
          disabled={tab === "users" ? usersLoading : false}
        >
          Refresh
        </Button>
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v as AdminTabKey)} sx={{ mb: 2 }}>
        <Tab value="users" label="Users" />
        <Tab value="approvers" label="Approvers" />
      </Tabs>

      {tab === "users" && (
        <>
          {usersError && <Alert severity="error" sx={{ mb: 2 }}>{usersError}</Alert>}

          {usersLoading ? (
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 4 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">Loading users...</Typography>
            </Stack>
          ) : (
            <UsersAdminPanel
              users={users}
              onRoleChanged={async (appUserItemId, role) => {
                // DataSource has the "last admin" guard
                await DataSource.updateAppUserRole(appUserItemId, role);
                await loadUsers();
              }}
            />
          )}
        </>
      )}

      {tab === "approvers" && (
        <>
          {lookupsError && <Alert severity="error" sx={{ mb: 2 }}>{lookupsError}</Alert>}

          <ApproversAdminPanel
            context={context}
            config={config}
            lobs={lobs}
            ogs={ogs}
            entities={entities}
            //onRefresh={refreshLookups} // LATER
            onSaved={refreshLookups}
          />
        </>
      )}
    </Box>
  );
};

export default Admin;