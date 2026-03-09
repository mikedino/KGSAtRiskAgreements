import * as React from "react";
import { Typography, Skeleton, List, ListItem, ListItemText } from "@mui/material";
import { IAttachmentInfo } from "../data/props";
import { ContextInfo } from "gd-sprest";

interface AttachmentsListProps {
  attachments: IAttachmentInfo[];
  loading?: boolean;
}

const AttachmentsList: React.FC<AttachmentsListProps> = ({ attachments, loading }) => {

  const officeExtensions = new Set([
    "docx", "docm", "dotx", "dotm", "doc",
    "xlsx", "xlsm", "xlsb", "xltx", "xltm", "xls",
    "pptx", "pptm", "ppsx", "ppsm", "potx", "potm", "ppt",
    "one", "onetoc2", "vsdx", "vsdm", "vssx", "vssm", "vstx", "vstm"
  ]);

  const getExtension = (fileName: string): string =>
    fileName.split(".").pop()?.toLowerCase() ?? "";

  const isOfficeDoc = (fileName: string): boolean =>
    officeExtensions.has(getExtension(fileName));

  const buildAttachmentUrl = (attachment: IAttachmentInfo): string => {

    if (!attachment.FileName) {
      return "";
    }

    //standard URL for non-Office docs
    const directUrl = attachment.ServerRelativeUrl || attachment.ServerRelativePath?.DecodedUrl || "";

    if (!isOfficeDoc(attachment.FileName) || !attachment.UniqueId) {
      return directUrl;
    }

    const encodedFileName = encodeURIComponent(attachment.FileName);

    // Use WOPI for Office docs
    return `${ContextInfo.webAbsoluteUrl}/_layouts/15/WopiFrame.aspx?sourcedoc=${attachment.UniqueId}&file=${encodedFileName}&action=default`
  };

  if (loading) {
    return <Skeleton variant="rectangular" height={80} />;
  }

  if (!attachments.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
        No attachments
      </Typography>
    );
  }

  return (
    <List dense>
      {attachments.map(a => (
        <ListItem key={a.FileName} component="a" href={buildAttachmentUrl(a)} target="_blank" sx={{ py: 0 }} >
          <ListItemText primary={a.FileName} sx={{ root: { my: 0 }}} />
        </ListItem>
      ))}
    </List>
  );
};

export default AttachmentsList;