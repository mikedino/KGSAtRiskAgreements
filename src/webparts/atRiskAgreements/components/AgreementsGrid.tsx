import * as React from "react";
import dayjs from "dayjs";
import { Box, Typography, TextField, MenuItem, Stack, Chip } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useHistory } from "react-router-dom";
import { DataSource } from "../data/ds";
import { IRiskAgreementItem, AraStatus } from "../data/props";

const AgreementsGrid: React.FC = () => {

  const history = useHistory();
  const [search, setSearch] = React.useState("");
  const [entityFilter, setEntityFilter] = React.useState("");

  const gridStyles = {
    border: "none",

    "& .MuiDataGrid-columnHeaders": {
      borderBottom: "1px solid",
      borderColor: "divider",
      fontWeight: 600
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
      borderColor: "divider"
    }
  };

  const entities = React.useMemo(
    () =>
      Array.from(
        new Set(DataSource.Agreements.map((a) => a.entity).filter(Boolean))
      ).sort(),
    []
  );

  const filterAgreements = (
    items: IRiskAgreementItem[],
    search: string,
    entity: string
  ): IRiskAgreementItem[] => {
    const term = search.toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !term ||
        item.projectName?.toLowerCase().includes(term) ||
        item.invoice?.toLowerCase().includes(term) ||
        item.entity?.toLowerCase().includes(term) ||
        item.projectMgr?.Title.toLowerCase().includes(term) ||
        item.contractMgr?.Title.toLowerCase().includes(term);

      const matchesEntity = !entity || item.entity === entity;

      return matchesSearch && matchesEntity;
    });
  };

const getStatusChip = (status: IRiskAgreementItem["araStatus"]): JSX.Element => {
  const colorMap: Record<AraStatus, "default" | "success" | "warning" | "error" | "info"> = {
    Draft: "default",           // gray / neutral
    Submitted: "warning",       // amber/yellow
    "Under Review": "info",     // blue
    Approved: "success",        // green
    Rejected: "error",          // red
    Resolved: "success",        // green (same as Approved)
    Cancelled: "default"        // gray / neutral
  };

  return (
    <Chip
      label={status}
      size="small"
      color={colorMap[status]}
      sx={{ fontWeight: 500 }}
    />
  );
};

  const rows = React.useMemo(
    () =>
      filterAgreements(
        DataSource.Agreements,
        search,
        entityFilter
      ),
    [search, entityFilter]
  );

  const columns: GridColDef[] = [
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
      minWidth: 140
    },
    {
      field: "contractType",
      headerName: "Contract",
      width: 110
    },
    {
      field: "entity",
      headerName: "Entity",
      flex: 1,
      minWidth: 160
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
      width: 170,
      align: "right",
      headerAlign: "right",
      renderCell: (params) =>
        params.row.riskFundingRequested.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0
        })
    }
  ];

  return (
    <Box sx={{ px: 3, pb: 4 }}>
      <Typography variant="h4" fontWeight={600} gutterBottom>All Agreements</Typography>

      {/* SEARCH + FILTER BAR */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>

        <TextField
          label="Search Agreements"
          size="small"
          fullWidth
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <TextField
          label="Filter by Entity"
          size="small"
          select
          sx={{ minWidth: 220 }}
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
        >
          <MenuItem value="">All Entities</MenuItem>
          {entities.map((entity) => (
            <MenuItem key={entity} value={entity}>
              {entity}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Box sx={{ height: "calc(100vh - 310px)", bgcolor: "background.paper", borderRadius: 2 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(row) => row.Id}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10, page: 0 } }
          }}
          onRowClick={(params) =>
            history.push(`/view/${params.row.Id}`)
          }
          sx={gridStyles}
        />
      </Box>
    </Box>
  );
};

export default AgreementsGrid;
