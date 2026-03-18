import * as React from "react";
import { Typography, Skeleton, List, ListItemText, ListItemButton, ListItemIcon } from "@mui/material";
import { IAttachmentInfo } from "../data/props";
import { ContextInfo } from "gd-sprest";

import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import SlideshowOutlinedIcon from "@mui/icons-material/SlideshowOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";

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

  const getFileIcon = (fileName: string): JSX.Element => {
    const ext = getExtension(fileName);

    if (["doc", "docx", "docm", "dotx", "dotm"].includes(ext)) {
      return <DescriptionOutlinedIcon fontSize="small" />;
    }

    if (["xls", "xlsx", "xlsm", "xlsb", "xltx", "xltm", "csv"].includes(ext)) {
      return <TableChartOutlinedIcon fontSize="small" />;
    }

    if (["ppt", "pptx", "pptm", "ppsx", "ppsm", "potx", "potm"].includes(ext)) {
      return <SlideshowOutlinedIcon fontSize="small" />;
    }

    if (ext === "pdf") {
      return <PictureAsPdfOutlinedIcon fontSize="small" />;
    }

    if (["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "tif", "tiff"].includes(ext)) {
      return <ImageOutlinedIcon fontSize="small" />;
    }

    return <AttachFileOutlinedIcon fontSize="small" />;
  };

  const buildAttachmentUrl = (attachment: IAttachmentInfo): string => {

    if (!attachment.FileName) {
      return "";
    }

    //standard URL for non-Office docs
    const directUrl = `${document.location.origin}${attachment.ServerRelativeUrl}`;

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
      {attachments.map((a) => {
        const fileName = a.FileName ?? "";
        const link = buildAttachmentUrl(a);

        return (
          <ListItemButton
            key={fileName}
            disableGutters
            sx={{
              //py: 0.25,
              //px: 0,
              alignItems: "center",
              color: "info.main", // restore link-style color
              textAlign: "left",
              "&:hover": {
                backgroundColor: "transparent",
                textDecoration: "underline"
              },
              "& .MuiListItemText-primary": {
                color: "info.main"
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              window.open(link, "_blank", "noopener,noreferrer");
            }}
          >
            <ListItemIcon sx={{ minWidth: 28, color: "info.main" }} >
              {getFileIcon(fileName)}
            </ListItemIcon>

            <ListItemText
              primary={fileName}
              title={fileName}
              sx={{ my: 0 }}
              slotProps={{
                primary: {
                  variant: "body2",
                  noWrap: true
                }
              }}
            />
          </ListItemButton>
        );
      })}
    </List>
  );
};

export default AttachmentsList;