import * as React from "react";
import { Typography, Skeleton, List, ListItem, ListItemText } from "@mui/material";
import { IAttachmentInfo } from "../data/props";

interface AttachmentsListProps {
  attachments: IAttachmentInfo[];
  loading?: boolean;
}

const AttachmentsList: React.FC<AttachmentsListProps> = ({
  attachments,
  loading
}) => {
  if (loading) {
    return <Skeleton variant="rectangular" height={80} />;
  }

  if (!attachments.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No attachments
      </Typography>
    );
  }

  return (
    <List dense>
      {attachments.map(a => (
        <ListItem key={a.FileName} component="a" href={a.ServerRelativeUrl} target="_blank" >
          <ListItemText primary={a.FileName} />
        </ListItem>
      ))}
    </List>
  );
};

export default AttachmentsList;