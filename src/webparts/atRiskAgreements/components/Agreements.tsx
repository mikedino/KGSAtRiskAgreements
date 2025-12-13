import * as React from "react";
import { Typography, Box } from "@mui/material";

const Agreements: React.FC = () => {
  return (
    <Box sx={{ p: 10, width: "100%", border: "1px solid gray" }}>
      <Typography variant="h4">Agreements</Typography>

      {/* <Route path="/agreements/:id">
  <RiskAgreementForm
    context={context}
    mode="edit"
    item={agreement}
    onSubmit={handleUpdateAgreement}
    onCancel={() => history.goBack()}
  />
</Route> */}
    </Box>
  );
};

export default Agreements;
