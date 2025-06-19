# Task Export Format Examples

This document demonstrates the different export formats available in the Task Extractor feature.

## Available Export Formats

### 1. JSON Format
Perfect for programmatic use and data backup. Preserves all metadata and structure.

```json
{
  "tasks": [
    {
      "id": "TASK-001",
      "title": "Setup CI/CD Pipeline",
      "description": "Configure GitHub Actions for automated testing and deployment",
      "priority": "high",
      "category": "technical",
      "status": "pending",
      "confidence": 0.9,
      "tags": ["devops", "automation"]
    }
  ],
  "summary": "Found 1 technical task requiring immediate attention",
  "totalTasksFound": 1,
  "exportedAt": "2025-06-19T10:00:00Z",
  "exportVersion": "1.0"
}
```

### 2. Markdown Format
Ideal for documentation, GitHub issues, or note-taking apps.

```markdown
---
title: Task Export
date: 2025-06-19T10:00:00Z
total_tasks: 3
urgency: high
complexity: moderate
topics: [authentication, security, performance]
---

# Task Export Summary

Extracted 3 key tasks focusing on authentication improvements and security enhancements.

## 🟠 High Priority

### ☐ Implement Two-Factor Authentication

Add 2FA support to the user authentication system using TOTP.

- **Category:** technical
- **Status:** pending
- **Estimated Hours:** 8
- **Tags:** #authentication #security

## 🟡 Medium Priority

### ☐ Add Rate Limiting

Implement API rate limiting to prevent abuse.

- **Category:** technical
- **Status:** pending
- **Estimated Hours:** 4
- **Tags:** #security #api
```

### 3. Universal CSV Format
Works with Excel, Google Sheets, and most spreadsheet applications.

```csv
ID,Title,Description,Priority,Category,Status,Assignee,Due Date,Estimated Hours,Tags
TASK-001,Setup CI/CD Pipeline,Configure GitHub Actions for automated testing,high,technical,pending,devops@team.com,2025-06-25,8,devops; automation
TASK-002,Implement Authentication,Add JWT-based authentication system,urgent,technical,in_progress,backend@team.com,2025-06-20,16,security; backend
```

### 4. Notion CSV Format
Optimized for Notion database import with proper formatting.

```csv
Name,Description,Status,Priority,Category,Due Date,Time Estimate,Assigned To,Tags,Created
"Setup Development Environment","Install and configure all required development tools",Not Started,🟡 Medium,Technical,06/25/2025,4 hours,new-dev@company.com,"onboarding, setup",06/19/2025
"Review Security Policies","Audit and update security documentation",In Progress,🟠 High,Documentation,06/22/2025,2 hours,security@company.com,"security, compliance",06/19/2025
```

### 5. Linear CSV Format
Ready for import into Linear issue tracking system.

```csv
Title,Description,Status,Priority,Assignee,Labels,Due Date,Estimate,Project,Team
"Fix Authentication Bug","Users unable to login with SSO",Backlog,2,auth-team@company.com,"bug, authentication, sso",2025-06-20,4,,
"Add Dashboard Analytics","Implement analytics tracking for user dashboard",In Progress,3,frontend@company.com,"feature, analytics, frontend",2025-06-30,8,,
```

## Export Options

Each format supports various options:

- **Include Metadata**: Add extraction context like topics, urgency level, and complexity
- **Include Confidence**: Show AI confidence scores for each extracted task
- **Date Format**: Choose between ISO (YYYY-MM-DD), US (MM/DD/YYYY), or EU (DD/MM/YYYY) formats

## Usage Tips

1. **For Project Management Tools**: Use Notion CSV or Linear CSV for direct import
2. **For Documentation**: Use Markdown format for readable task lists
3. **For Data Analysis**: Use JSON or CSV formats for programmatic processing
4. **For Quick Sharing**: Use the "Copy to Clipboard" feature for any format

## Import Instructions

### Notion
1. Create a new database or open existing one
2. Click "..." menu → "Merge with CSV"
3. Upload the exported Notion CSV file
4. Map fields if needed

### Linear
1. Go to Settings → Import/Export
2. Select "Import from CSV"
3. Upload the Linear CSV file
4. Review and confirm import

### Other Tools
- **Trello**: Convert CSV to Trello format using their import tool
- **Jira**: Use CSV import feature in project settings
- **GitHub Issues**: Copy Markdown format into issue description
- **Asana**: Import CSV through their CSV importer