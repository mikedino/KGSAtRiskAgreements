import * as React from "react";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { Box, Typography, TextField, MenuItem, Stack, Chip, Tooltip, Button } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useHistory } from "react-router-dom";
import { DataSource } from "../data/ds";
import { IRiskAgreementItem, AraStatus } from "../data/props";
import { useTheme } from "@mui/material/styles";
import EmptyState, { EmptyStateProps } from "../ui/EmptyStateBox";
import { useAgreements } from "../services/agreementsContext";

type AgreementViewKey =
  | "all"
  | "active"
  | "pending"
  | "rejected"
  | "cancelled"
  | "expiring"
  | "expired";

interface AgreementView {
  key: AgreementViewKey;
  label: string;
  tooltip: string;
  predicate: (item: IRiskAgreementItem) => boolean;
}

const AgreementsGrid: React.FC = () => {

  const { agreements } = useAgreements();
  const theme = useTheme();
  const today = useMemo(() => dayjs(), []); // compute once per mount
  const history = useHistory();
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
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
      tooltip: "Approved or Resolved agreements with a Risk End date in the future",
      predicate: a =>
        ["Approved", "Resolved"].includes(a.araStatus) &&
        !!a.riskEnd &&
        dayjs(a.riskEnd).isAfter(today, "day")
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
      key: "cancelled",
      label: "Cancelled",
      tooltip: "Cancelled agreements",
      predicate: a => a.araStatus === "Cancelled"
    },
    {
      key: "expiring",
      label: "Expiring soon",
      tooltip: "Approved or Resolved agreements expiring within 4 weeks",
      predicate: a =>
        ["Approved", "Resolved"].includes(a.araStatus) &&
        !!a.riskEnd &&
        dayjs(a.riskEnd).isAfter(today, "day") &&
        dayjs(a.riskEnd).isBefore(today.add(4, "week"), "day")
    },
    {
      key: "expired",
      label: "Expired",
      tooltip: "Approved or Resolved agreements with a past Risk End date",
      predicate: a =>
        ["Approved", "Resolved"].includes(a.araStatus) &&
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

    // "& .MuiDataGrid-cell": {
    //   backgroundColor: theme.custom?.cardBg
    // },

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

  // compute view counts for each chip
  const viewCounts = React.useMemo(() => {
    return agreementViews.reduce<Record<AgreementViewKey, number>>((acc, view) => {
      acc[view.key] = agreements.filter(a => a.araStatus !== "Draft" && view.predicate(a)).length;
      return acc;
    }, {} as Record<AgreementViewKey, number>);
  }, [agreements, agreementViews]);

  const filterAgreements = (
    items: IRiskAgreementItem[],
    search: string,
    entity: string,
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
          item.projectName?.toLowerCase().includes(term) ||
          item.invoice?.toLowerCase().includes(term) ||
          item.projectMgr?.Title.toLowerCase().includes(term) ||
          item.contractMgr?.Title.toLowerCase().includes(term);

        const matchesEntity = !entity || item.entity === entity;
        const matchesContract = !contractType || item.contractType === contractType;

        return (matchesSearch && matchesEntity && matchesContract);
      });
  };

  const statusColorMap: Record<
    AraStatus,
    "default" | "success" | "warning" | "error" | "info"
  > = {
    Draft: "default",
    Submitted: "warning",
    "Under Review": "info",
    Approved: "success",
    Rejected: "error",
    Resolved: "success",
    Cancelled: "default"
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
    setContractTypeFilter("");
  };

  const hasActiveFilters =
    Boolean(search?.trim()) ||
    Boolean(entityFilter) ||
    Boolean(contractTypeFilter);

  // final data grid rows/items
  const rows = React.useMemo(() => {
    return filterAgreements(
      agreements,
      search,
      entityFilter,
      contractTypeFilter,
      selectedView
    );
  }, [agreements, search, entityFilter, contractTypeFilter, selectedView]);

  const columns: GridColDef[] = [
    {
      field: "Title",
      headerName: "ATR Title",
      width: 150,
      minWidth: 120
    },
    {
      field: "projectName",
      headerName: "Project",
      flex: 1.6,
      minWidth: 200
    },
    {
      field: "invoice",
      headerName: "Invoice",
      width: 80
    },
    {
      field: "contractType",
      headerName: "Contract Type",
      minWidth: 80
    },
    {
      field: "entity",
      headerName: "Entity",
      width: 80
    },
    {
      field: "araStatus",
      headerName: "Status",
      minWidth: 130,
      renderCell: (params) => getStatusChip(params.value)
    },
    {
      field: "riskStart",
      headerName: "Risk Start",
      minWidth: 120,
      renderCell: (params) =>
        params.row.riskStart
          ? dayjs(params.row.riskStart).format("MM/DD/YYYY")
          : ""
    },
    {
      field: "riskEnd",
      headerName: "Risk End",
      minWidth: 120,
      renderCell: (params) =>
        params.row.riskEnd
          ? dayjs(params.row.riskEnd).format("MM/DD/YYYY")
          : ""
    },
    {
      field: "popEnd",
      headerName: "PoP End",
      minWidth: 120,
      renderCell: (params) =>
        params.row.popEnd
          ? dayjs(params.row.popEnd).format("MM/DD/YYYY")
          : ""
    },
    {
      field: "riskFundingRequested",
      headerName: "Funding Requested",
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
      minWidth: 120,
      renderCell: (params) =>
        params.row.Created
          ? dayjs(params.row.Created).format("MM/DD/YYYY")
          : ""
    }
  ];

  const getAgreementsEmptyState = (viewKey: string): EmptyStateProps => {
    switch (viewKey) {
      case "active":
        return {
          title: "No active agreements",
          description: "There are no Approved or Resolved agreements with a future Risk End date."
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
      case "cancelled":
        return {
          title: "No cancelled agreements",
          description: "There are no cancelled agreements in this view."
        };
      case "expiring":
        return {
          title: "Nothing expiring soon",
          description: "There are no Approved or Resolved agreements expiring within the next 4 weeks."
        };
      case "expired":
        return {
          title: "No expired agreements",
          description: "There are no Approved or Resolved agreements with a past Risk End date."
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
    <Box sx={{ px: 3, pb: 4 }}>
      <Typography variant="h4" fontWeight={600} gutterBottom>All Agreements</Typography>

      {/* SEARCH + FILTER BAR */}
      <Box
        sx={{
          mb: 3,
          p: 3,
          bgcolor: theme.custom?.cardBg,
          border: "1px solid",
          borderColor: theme.custom?.cardBorder,
          borderRadius: 3
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignContent="center"
          alignItems={{ md: "flex-end" }}
        >
          <TextField
            label="Search Agreements"
            placeholder="Search by Project, Invoice, Contract Mgr, Project Mgr"
            size="small"
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <TextField
            label="Entity"
            size="small"
            select
            sx={{ minWidth: 160 }}
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
            label="Contract Type"
            size="small"
            select
            sx={{ minWidth: 180 }}
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
              whiteSpace: "nowrap"
            }}
          >
            Clear filters
          </Button>
        </Stack>
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
