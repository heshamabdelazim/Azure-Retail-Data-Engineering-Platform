# 🔴🟢DEPI-Graduation_Project (Smart Retail Pro)

A completely new version of the **Smart Retail Data Engineering Platform** project that runs locally with an easy-to-use graphical interface.

## Easiest Way to Run

Run this file:

```text
launcher\main.py
```

Or use:

```text
START_PROJECT.cmd
```

The project interface will open in the browser on a local address such as:

```text
http://127.0.0.1:4173
```

## Features of the New Version

- Does not depend on `node` being available in PATH.
- Includes a local runtime inside the `runtime` folder.
- Graphical interface for project management.
- Complete Pipeline: Source, Bronze, Silver, Gold.
- SQLite Warehouse with SQL views.
- Executive, Data Quality, and Dashboard reports.
- Professional Word report and PowerPoint presentation collection inside the `docs` folder, including an overview presentation, code explanation presentation, and specialized presentations for the database, Pipeline, UX/UI, deployment, Python, testing, business value, and discussion.
- A real Azure-ready version inside the `azure` folder with Bicep, App Service Backend, Azure Data Lake, and Azure SQL.
- Browse code, data, and the database directly from the interface.
- Run tests directly from the interface.
- Added Python implementation for the core logic inside `app/python`.

## Python Version of the Core Logic

If you want to run the project's core logic using Python, use:

```text
RUN_PYTHON_PIPELINE.cmd
```

Or:

```text
py -3 app\python\smart_retail_pipeline.py run
```

Main Python file:

```text
app\python\smart_retail_pipeline.py
```

## Important Note

This version targets Windows x64 devices. If the folder is moved to another machine, move the entire `SmartRetailPro` folder exactly as it is.
