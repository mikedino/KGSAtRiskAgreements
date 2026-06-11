import * as React from "react";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { Box, Typography, TextField, MenuItem, Stack, Chip, Tooltip, Button } from "@mui/material";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useHistory } from "react-router-dom";
import { DataSource } from "../data/ds";
import { IRiskAgreementItem, AraStatus } from "../data/props";
import { useTheme } from "@mui/material/styles";
import EmptyState, { EmptyStateProps } from "../ui/EmptyStateBox";
import { useAgreements } from "../services/agreementsContext";
import { formatDate } from "../services/utils";
import { exportAgreementRows } from "../services/exportAgreements";
import { isActiveByRiskEnd } from "../services/dashboardHelpers";

type AgreementViewKey =
  | "all"
  | "active"
  | "pending"
  | "rejected"
  | "canceled"
  | "resolved"
  | "expiring"
  | "expired";

interface AgreementView {
  key: AgreementViewKey;
  label: string;
  tooltip: string;
  predicate: (item: IRiskAgreementItem) => boolean;
}

export type AgreementGridRow = IRiskAgreementItem & {
  pendingWorkflowRole: string;
};

const AgreementsGrid: React.FC = () => {

  const { agreements, runByAgreementId } = useAgreements();
  const theme = useTheme();
  const today = useMemo(() => dayjs(), []); // compute once per mount
  const history = useHistory();
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [lobFilter, setLobFilter] = useState("");
  const [contractTypeFilter, setContractTypeFilter] = useState("");
  const [selectedView, setSelectedView] = useState<AgreementViewKey>("all");

  const agreementViews = useMemo<AgreementView[]>(() => [
    {
      key: "all",
      label: "All",
      tooltip: "Everything",
      predicate: () => true
    },
    {
      key: "active",
      label: "Active",
      tooltip: "Approved agreements that have not been resolved, including active modifications",
      predicate: a => isActiveByRiskEnd(a)
    },
    {
      key: "pending",
      label: "Pending",
      tooltip: "Submitted or Under Review agreements",
      predicate: a =>
        ["Submitted", "Under Review"].includes(a.araStatus)
    },
    {
      key: "rejected",
      label: "Rejected",
      tooltip: "Rejected agreements",
      predicate: a => a.araStatus === "Rejected"
    },
    {
      key: "canceled",
      label: "Canceled",
      tooltip: "Canceled agreements",
      predicate: a => a.araStatus === "Canceled"
    },
    {
      key: "resolved",
      label: "Resolved",
      tooltip: "All Resolved agreements",
      predicate: a => a.araStatus === "Resolved"
    },
    {
      key: "expiring",
      label: "Expiring soon",
      tooltip: "Approved agreements expiring within 4 weeks",
      predicate: a =>
        //["Approved", "Resolved"].includes(a.araStatus) &&
        a.araStatus === "Approved" && !!a.riskEnd &&
        dayjs(a.riskEnd).isAfter(today, "day") &&
        dayjs(a.riskEnd).isBefore(today.add(4, "week"), "day")
    },
    {
      key: "expired",
      label: "Expired",
      tooltip: "Approved agreements with a past Risk End date",
      predicate: a =>
        a.araStatus === "Approved" &&
        !!a.riskEnd &&
        dayjs(a.riskEnd).isBefore(today, "day")
    }
  ], [today]);

  const gridStyles = {
    border: "none",
    m: 2,

    "& .MuiDataGrid-columnHeader, .MuiDataGrid-cell": {
      backgroundColor: theme.custom?.cardBg
    },

    "& .MuiDataGrid-cell": {
      alignItems: "flex-start",
      py: 1
    },

    "& .MuiDataGrid-columnHeaders": {
      borderBottom: "1px solid",
      fontWeight: 600
    },

    "& .MuiDataGrid-columnSeparator": {
      color: theme.custom?.cardBorder
    },

    "& .MuiDataGrid-row": {
      borderBottom: "1px solid",
      borderColor: "divider"
    },

    "& .MuiDataGrid-row:hover": {
      backgroundColor: "action.hover",
      cursor: "pointer"
    },

    "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
      outline: "none"
    },

    "& .MuiDataGrid-footerContainer": {
      borderTop: "1px solid",
      //borderColor: "divider",
      backgroundColor: theme.custom?.cardBg
    }
  };

  // build entity mapping from entity record
  const entityMap = React.useMemo(() => {
    const map = new Map<string, string>();

    DataSource.Entities.forEach(e => {
      // key = what agreements store (abbr)
      // value = what users see
      map.set(e.abbr, e.combinedTitle);
    });

    return map;
  }, []);

  //update entity filter based on grid results
  const entities = React.useMemo(() => {
    return Array.from(
      new Set(
        DataSource.Agreements
          .map(a => a.entity)
          .filter(Boolean)
      )
    )
      .map(abbr => ({
        abbr,
        label: entityMap.get(abbr) ?? abbr
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [agreements, entityMap]);

  // update contract type based on results
  const contractTypes = React.useMemo(() => {
    return Array.from(new Set(agreements.map(a => a.contractType).filter(Boolean))).sort();
  }, [agreements]);

  const lobs = React.useMemo(() => {
    return Array.from(new Set(agreements.map(a => a.lob).filter(Boolean))).sort();
  }, [agreements]);

  const filterAgreements = (
    items: IRiskAgreementItem[],
    search: string,
    entity: string,
    lob: string,
    contractType: string,
    view: AgreementViewKey
  ): IRiskAgreementItem[] => {

    const term = search.toLowerCase();
    const viewDef = agreementViews.find(v => v.key === view)!

    return items
      //.filter(item => item.araStatus !== "Draft") // filtering in datasource already
      .filter(viewDef.predicate)
      .filter((item) => {
        const matchesSearch =
          !term ||
          item.Title.toLowerCase().includes(term) ||
          item.projectName?.toLowerCase().includes(term) ||
          item.invoice?.toLowerCase().includes(term) ||
          item.projectMgr?.Title.toLowerCase().includes(term) ||
          item.contractMgr?.Title.toLowerCase().includes(term) ||
          item.og?.toLowerCase().includes(term) ||
          item.lob?.toLowerCase().includes(term) ||
          item.riskJustification.toLowerCase().includes(term);

        const matchesEntity = !entity || item.entity === entity;
        const matchesLob = !lob || item.lob === lob;
        const matchesContract = !contractType || item.contractType === contractType;

        return (matchesSearch && matchesEntity && matchesLob && matchesContract);
      });
  };

  const statusColorMap: Record<
    AraStatus,
    "default" | "success" | "warning" | "error" | "info"
  > = {
    Draft: "default",
    Submitted: "warning",
    "Under Review": "info",
    "Mod Review": "info",
    Approved: "success",
    Rejected: "error",
    Resolved: "success",
    Canceled: "default"
  };

  const getStatusChip = (status: IRiskAgreementItem["araStatus"]): JSX.Element => {
    return (
      <Chip
        label={status}
        size="small"
        color={statusColorMap[status]}
      />
    );
  };

  const resetFilters = (): void => {
    setSearch("");
    setEntityFilter("");
    setLobFilter("");
    setContractTypeFilter("");
  };

  const hasActiveFilters =
    Boolean(search?.trim()) ||
    Boolean(entityFilter) ||
    Boolean(lobFilter) ||
    Boolean(contractTypeFilter);

  // Apply search/entity/contract filters without locking counts to the selected view.
  const baseFilteredAgreements = React.useMemo(() => {
    return filterAgreements(
      agreements,
      search,
      entityFilter,
      lobFilter,
      contractTypeFilter,
      "all"
    );
  }, [agreements, search, entityFilter, lobFilter, contractTypeFilter, agreementViews]);

  // final data grid rows/items
  const rows = React.useMemo<AgreementGridRow[]>(() => {
    return filterAgreements(
      baseFilteredAgreements,
      "",
      "",
      "",
      "",
      selectedView
    ).map((agreement) => {
      const currentRun = runByAgreementId.get(agreement.Id);
      const hasPendingWorkflow =
        agreement.araStatus === "Submitted" ||
        agreement.araStatus === "Under Review" ||
        agreement.araStatus === "Mod Review";

      return {
        ...agreement,
        pendingWorkflowRole: currentRun?.pendingRole ?? (hasPendingWorkflow ? "-" : "Workflow Complete")
      };
    });
  }, [baseFilteredAgreements, selectedView, runByAgreementId]);

  const handleExport = React.useCallback((): void => {
    exportAgreementRows(rows, `atr-export_${today.format('YYYY-MM-DD')}.csv`);
  }, [rows]);

  // compute view counts for each chip
  const viewCounts = React.useMemo(() => {
    return agreementViews.reduce<Record<AgreementViewKey, number>>((acc, view) => {
      acc[view.key] = baseFilteredAgreements.filter(a => a.araStatus !== "Draft" && view.predicate(a)).length;
      return acc;
    }, {} as Record<AgreementViewKey, number>);
  }, [baseFilteredAgreements, agreementViews]);

  const columns = React.useMemo<GridColDef<AgreementGridRow>[]>(() => {
    const baseColumns: GridColDef<AgreementGridRow>[] = [
      {
        field: "Title",
        headerName: "Agreement",
        flex: 1,
        minWidth: 200,
        renderCell: (params) => (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={500} noWrap title={params.row.Title}>
              {params.row.Title}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              title={entityMap.get(params.row.entity) ?? params.row.entity}
            >
              {entityMap.get(params.row.entity) ?? params.row.entity}
            </Typography>
          </Box>
        )
      },
      {
        field: "contractId",
        headerName: "Contract / Invoice",
        flex: 1,
        minWidth: 150,
        valueGetter: (_value, row) =>
          row.contractId
            ? row.contractId
            : row.projectName === "New Award"
              ? "New Award"
              : (row.invoice ?? ""),
        renderCell: (params) => (
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight={500}
              noWrap
              title={params.row.contractId ?? (params.row.projectName === "New Award" ? "New Award" : "No contract")}
            >
              {params.row.contractId ?? (params.row.projectName === "New Award" ? "New Award" : "-")}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              title={params.row.invoice ?? "No invoice"}
            >
              {params.row.invoice ?? "-"}
            </Typography>
          </Box>
        )
      },
      {
        field: "projectName",
        headerName: "Project/Program",
        flex: 1.4,
        minWidth: 210,
        valueGetter: (_value, row) =>
          row.projectName === "New Award"
            ? (row.programName ?? row.projectName ?? "")
            : (row.projectName ?? ""),
        renderCell: (params) => (
          <Typography
            variant="body2"
            sx={{ whiteSpace: "normal", lineHeight: 1.35, py: 0.25 }}
            title={params.value ?? ""}
          >
            {params.value}
          </Typography>
        )
      },
      {
        field: "araStatus",
        headerName: "Status",
        minWidth: 130,
        renderCell: (params) => getStatusChip(params.value)
      },
      {
        field: "pendingWorkflowRole",
        headerName: "Pending",
        minWidth: 180,
        flex: 1,
        sortable: false
      },
      {
        field: "riskStart",
        headerName: "Risk Start",
        minWidth: 120,
        renderCell: (params) => formatDate(params.row.riskStart)
      },
      {
        field: "riskEnd",
        headerName: "Risk End",
        minWidth: 120,
        renderCell: (params) => formatDate(params.row.riskEnd)
      },
      {
        field: "popEnd",
        headerName: "PoP End",
        minWidth: 120,
        renderCell: (params) => formatDate(params.row.popEnd)
      },
      {
        field: "riskFundingRequested",
        headerName: "Funding Req",
        minWidth: 130,
        flex: 1,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => {
          const value = params.row.riskFundingRequested ?? 0;
          return value.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0
          })
        }
      },
      {
        field: "Created",
        headerName: "Created",
        minWidth: 110,
        renderCell: (params) =>
          params.row.Created
            ? dayjs(params.row.Created).format("M/D/YYYY")
            : ""
      }
    ];

    if (selectedView === "all" || selectedView === "pending") {
      return baseColumns;
    }

    return baseColumns.filter((column) => column.field !== "pendingWorkflowRole");
  }, [selectedView, entityMap]);

  const getAgreementsEmptyState = (viewKey: string): EmptyStateProps => {
    switch (viewKey) {
      case "active":
        return {
          title: "No active agreements",
          description: "There are no active Approved agreements waiting to be resolved."
        };
      case "pending":
        return {
          title: "No pending agreements",
          description: "There are no Submitted or Under Review agreements right now."
        };
      case "rejected":
        return {
          title: "No rejected agreements",
          description: "There are no rejected agreements in this view."
        };
      case "canceled":
        return {
          title: "No canceled agreements",
          description: "There are no canceled agreements in this view."
        };
      case "resolved":
        return {
          title: "No resolved agreements",
          description: "There are no Resolved agreements in this view."
        };
      case "expiring":
        return {
          title: "Nothing expiring soon",
          description: "There are no Approved or Resolved agreements expiring within the next 4 weeks."
        };
      case "expired":
        return {
          title: "No expired agreements",
          description: "There are no Approved agreements with a past Risk End date."
        };
      case "all":
      default:
        return {
          title: "No agreements found",
          description: "Try a different view or adjust your filters."
        };
    }
  };

  return (
    <Box sx={{ width: "100%" }}>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "flex-start" }}
      >
        <Box sx={{ mb: 2 }}>
          <Typography variant="h4" fontWeight={700}>All Agreements</Typography>
          <Typography variant="body2" color="text.secondary">
            View and find all Agreements
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="secondary"
          startIcon={<DownloadOutlinedIcon />}
          onClick={handleExport}
          disabled={rows.length === 0}
          sx={{ alignSelf: { xs: "stretch", md: "flex-start" } }}
        >
          Export
        </Button>
      </Stack>

      {/* SEARCH + FILTER BAR */}
      <Box
        sx={{
          my: 3,
          p: 3,
          bgcolor: theme.custom?.cardBg,
          border: "1px solid",
          borderColor: theme.custom?.cardBorder,
          borderRadius: 3,
          display: "grid",
          gap: 1.5,
          alignItems: "center",
          gridTemplateColumns: {
            xs: "1fr",
            md: "minmax(0, 1.25fr) minmax(0, 1fr) minmax(120px, auto)",
            lg: "minmax(280px, 1.35fr) minmax(190px, 1fr) minmax(210px, 1fr) minmax(165px, 0.85fr) auto"
          }
        }}
      >
        {/* <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignContent="center"
          alignItems={{ md: "flex-end" }}
        > */}
        <TextField
          label="Search Agreements"
          placeholder="Search by Project, Invoice, Contract Mgr, Project Mgr"
          size="small"
          sx={{
            minWidth: 0,
            gridColumn: {
              xs: "1",
              md: "1 / span 2",
              lg: "auto"
            },
            "& .MuiInputBase-root": { minWidth: 0 }
          }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <TextField
          label="Entity"
          size="small"
          select
          sx={{
            minWidth: 0,
            gridColumn: {
              xs: "1",
              md: "3",
              lg: "auto"
            },
            "& .MuiSelect-select": {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }
          }}
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          {entities.map(e => (
            <MenuItem key={e.abbr} value={e.abbr}>
              {e.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="LOB"
          size="small"
          select
          sx={{
            minWidth: 0,
            gridColumn: {
              xs: "1",
              md: "1",
              lg: "auto"
            },
            "& .MuiSelect-select": {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }
          }}
          value={lobFilter}
          onChange={(e) => setLobFilter(e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          {lobs.map(lob => (
            <MenuItem key={lob} value={lob}>
              {lob}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Contract Type"
          size="small"
          select
          sx={{
            minWidth: 0,
            gridColumn: {
              xs: "1",
              md: "2",
              lg: "auto"
            },
            "& .MuiSelect-select": {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }
          }}
          value={contractTypeFilter}
          onChange={(e) => setContractTypeFilter(e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          {contractTypes.map(type => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </TextField>

        {/* RESET FILTERS */}
        <Button
          size="small"
          variant="text"
          disabled={!hasActiveFilters}
          onClick={resetFilters}
          sx={{
            px: 1,
            whiteSpace: "nowrap",
            justifySelf: {
              xs: "stretch",
              md: "end",
              lg: "start"
            },
            gridColumn: {
              xs: "1",
              md: "3",
              lg: "auto"
            }
          }}
        >
          Clear filters
        </Button>
        {/* </Stack> */}
      </Box>

      {/* PRE-FILTERED VIEWS */}
      <Box
        sx={{
          mb: 3,
          p: 1,
          bgcolor: theme.custom?.cardBg,
          border: "1px solid",
          borderColor: theme.custom?.cardBorder,
          borderRadius: 3
        }}
      >
        <Stack direction="row" alignItems="center" flexWrap="wrap">

          {agreementViews.map(view => {
            const isSelected = selectedView === view.key;

            return (
              <Tooltip
                key={view.key}
                title={view.tooltip}
                placement="top"
                arrow
              >
                <Button
                  size="small"
                  variant={isSelected ? "contained" : "text"}
                  color="primary"
                  onClick={() => setSelectedView(view.key)}
                  sx={{
                    textTransform: "none",
                    fontWeight: 400, //isSelected ? 500 : 400,
                    borderRadius: 2,
                    px: 1.5,
                    py: "2px",
                    fontFamily: "Roboto,Segoe UI,Arial,sans-serif !important",

                    // Unselected styling
                    ...(!isSelected && {
                      color: "text.secondary",
                      "&:hover": {
                        backgroundColor: "action.hover",
                        color: "text.primary"
                      }
                    })
                  }}
                >
                  {view.label} ({viewCounts[view.key]})
                </Button>
              </Tooltip>
            );
          })}
        </Stack>

      </Box>

      {/* AGREEMENTS GRID */}
      <Box
        sx={{
          backgroundColor: theme.custom?.cardBg,
          border: "1px solid",
          borderColor: theme.custom?.cardBorder,
          borderRadius: 3,
          overflow: "hidden"
        }}
      >
        {rows.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <EmptyState {...getAgreementsEmptyState(selectedView)} />
          </Box>
        ) : (
          <DataGrid
            autoHeight
            density="compact"
            rows={rows}
            columns={columns}
            getRowHeight={() => "auto"}
            getRowId={(row) => row.Id}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              sorting: { sortModel: [{ field: "Created", sort: "desc" }] },
              pagination: { paginationModel: { pageSize: 10, page: 0 } }
            }}
            onRowClick={(params) =>
              history.push(`/view/${params.row.Id}`)
            }
            // getRowClassName={(params) =>
            //   params.indexRelativeToCurrentPage % 2 === 0 ? 'even-row' : 'odd-row'
            // }
            sx={gridStyles}
          />
        )}
      </Box>

    </Box>
  );
};

export default AgreementsGrid;
