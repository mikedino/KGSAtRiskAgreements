# kgs-at-risk-agreements

## Summary

**KGS At-Risk Agreements** is a SharePoint Framework (SPFx) application that manages the full lifecycle of *At-Risk Agreements*, including submission, multi-step approval workflows, modification handling, and complete historical audit visibility.

The solution supports:

- Guided, role-based approval workflows
- Agreement modifications that automatically restart approvals when required
- Full workflow history with multiple runs, actions, comments, and change summaries
- Personalized dashboards for approvers and submitters
- A detailed agreement view with expandable workflow timelines and change history

This solution is designed for environments where governance, traceability, and auditability of approvals are critical.

---

## Used SharePoint Framework Version

![version](https://img.shields.io/badge/version-1.21.1-green.svg)

---

## Applies to

- SharePoint Framework (SPFx)
- SharePoint Online
- Microsoft 365 tenant

> Get your own free development tenant by subscribing to the  
> [Microsoft 365 Developer Program](https://aka.ms/o365devprogram)

---

## Prerequisites

- SharePoint Online
- SPFx development environment configured
- Node.js version compatible with SPFx 1.21.1
- Permissions to create and manage SharePoint Lists and Libraries
- Site Owner or Administrator access for initial setup

---

## Solution

| Solution | Author |
| -------- | -------- |
| KGS At-Risk Agreements | Mike Landino (Koniag Government Solutions) |

---

## Version History

| Version | Date | Comments |
| ------- | ------ | ---------- |
| 2.0.0.6 | April 8, 2026 | Initial production release |

---

## Disclaimer

**THIS CODE IS PROVIDED _AS IS_ WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.**

---

## Minimal Path to Awesome

- git clone <https://github.com/mikedino/KGSAtRiskAgreements.git>
- cd kgs-at-risk-agreements
- npm install
- gulp serve

## Key Features

### Agreement Lifecycle Management

- Create and submit At-Risk Agreements
- Edit agreements prior to approval
- Automatically detect when a modification requires workflow restart

### Approval Workflow Engine

- Multi-step approval workflow
- Role-based approvers resolved at runtime
- Support for skipped or conditional steps
- Clear “Current”, “Approved”, “Rejected”, and “Queued” states

### Workflow Runs & History

- Each workflow restart creates a new Run
- Runs are preserved for historical reference
- Expandable accordion view of all runs
- Current run is emphasized; previous runs are read-only

### Change History & Audit Trail

- Change summaries captured on modification
- Who changed what, when, and in which run
- Global Change History drawer showing all modifications
- Per-run change details available directly from the workflow timeline

### My Work Dashboard

- "My Action" — items waiting on the current user
- "My Reviewed" — agreements the user approved or rejected
- "Pending", "Approved", "Resolved", and "All" views
- Fully derived from workflow state and actions

### Performance-Conscious Data Loading

- Lightweight boot load for dashboards
- On-demand loading of full workflow history when viewing an agreement
- Explicit cache invalidation on refresh to prevent stale data
- Context-based state management to avoid prop-drilling