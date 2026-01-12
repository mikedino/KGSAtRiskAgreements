import * as React from "react";
import dayjs from "dayjs";
import { Box, Typography, TextField, MenuItem, Stack, Chip, Tooltip, Button } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useHistory } from "react-router-dom";
import { DataSource } from "../data/ds";
import { IRiskAgreementItem, AraStatus } from "../data/props";
import { useTheme } from "@mui/material/styles";

type AgreementViewKey =
  | "all"
  | "active"
  | "pending"
  | "rejected"
  | "expiring"
  | "expired";

interface AgreementView {
  key: AgreementViewKey;
  label: string;
  tooltip: string;
  predicate: (item: IRiskAgreementItem) => boolean;
}

const AgreementsGrid: React.FC = () => {

  const theme = useTheme();
  const today = dayjs();
  const history = useHistory();
  const [search, setSearch] = React.useState("");
  const [entityFilter, setEntityFilter] = React.useState("");
  const [contractTypeFilter, setContractTypeFilter] = React.useState("");
  const [selectedView, setSelectedView] = React.useState<AgreementViewKey>("all");

  const agreementViews: AgreementView[] = [
    {
      key: "all",
      label: "All",
      tooltip: "Everything",
      predicate: () => true
    },
    {
      key: "active",
      label: "Active",
      tooltip:
        "Approved or Resolved agreements with a Risk End date in the future",
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
      key: "expiring",
      label: "Expiring soon",
      tooltip:
        "Approved or Resolved agreements expiring within 4 weeks",
      predicate: a =>
        ["Approved", "Resolved"].includes(a.araStatus) &&
        !!a.riskEnd &&
        dayjs(a.riskEnd).isAfter(today, "day") &&
        dayjs(a.riskEnd).isBefore(today.add(4, "week"), "day")
    },
    {
      key: "expired",
      label: "Expired",
      tooltip:
        "Approved or Resolved agreements with a past Risk End date",
      predicate: a =>
        ["Approved", "Resolved"].includes(a.araStatus) &&
        !!a.riskEnd &&
        dayjs(a.riskEnd).isBefore(today, "day")
    }
  ];

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

  //update entity filter based on grid results
  const entities = React.useMemo(
    () =>
      Array.from(
        new Set(DataSource.Agreements.map((a) => a.entity).filter(Boolean))
      ).sort(),
    []
  );

  // // update status filter based on results
  // const statuses = React.useMemo(
  //   () =>
  //     Array.from(
  //       new Set(
  //         DataSource.Agreements
  //           .map(a => a.araStatus)
  //           .filter(s => s && s !== "Draft")
  //       )
  //     ).sort(),
  //   []
  // );

  // update contract type based on results
  const contractTypes = React.useMemo(
    () =>
      Array.from(
        new Set(
          DataSource.Agreements
            .map(a => a.contractType)
            .filter(Boolean)
        )
      ).sort(),
    []
  );

  // compute view counts for each chip
  const viewCounts = React.useMemo(() => {
    return agreementViews.reduce<Record<AgreementViewKey, number>>(
      (acc, view) => {
        acc[view.key] = DataSource.Agreements.filter(a =>
          a.araStatus !== "Draft" && view.predicate(a)
        ).length;
        return acc;
      },
      {} as Record<AgreementViewKey, number>
    );
  }, []);

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
      //persistent filter - don't show Draft
      .filter(item => item.araStatus !== "Draft")
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

  const rows = React.useMemo(
    () =>
      filterAgreements(
        DataSource.Agreements,
        search,
        entityFilter,
        contractTypeFilter,
        selectedView
      ),
    [search, entityFilter, contractTypeFilter, selectedView]
  );

  const columns: GridColDef[] = [
    {
      field: "Title",
      headerName: "ATR Title",
      width: 130,
    },
    {
      field: "projectName",
      headerName: "Project",
      flex: 1.6,
      minWidth: 220
    },
    {
      field: "invoice",
      headerName: "Invoice",
      flex: 1,
      width: 90
    },
    {
      field: "contractType",
      headerName: "Contract",
      flex: 1,
      minWidth: 100
    },
    {
      field: "entity",
      headerName: "Entity",
      width: 80
    },
    {
      field: "araStatus",
      headerName: "Status",
      width: 140,
      renderCell: (params) => getStatusChip(params.value)
    },
    {
      field: "riskStart",
      headerName: "Risk Start",
      width: 120,
      renderCell: (params) =>
        params.row.riskStart
          ? dayjs(params.row.riskStart).format("MM/DD/YYYY")
          : ""
    },
    {
      field: "riskEnd",
      headerName: "Risk End",
      width: 120,
      renderCell: (params) =>
        params.row.riskEnd
          ? dayjs(params.row.riskEnd).format("MM/DD/YYYY")
          : ""
    },
    {
      field: "popEnd",
      headerName: "PoP End",
      width: 120,
      renderCell: (params) =>
        params.row.popEnd
          ? dayjs(params.row.popEnd).format("MM/DD/YYYY")
          : ""
    },
    {
      field: "riskFundingRequested",
      headerName: "Funding Requested",
      width: 160,
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
      width: 120,
      renderCell: (params) =>
        params.row.Created
          ? dayjs(params.row.Created).format("MM/DD/YYYY")
          : ""
    }
  ];

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
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
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
            {entities.map(entity => (
              <MenuItem key={entity} value={entity}>
                {entity}
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
      </Box>

    </Box>
  );
};

export default AgreementsGrid;
