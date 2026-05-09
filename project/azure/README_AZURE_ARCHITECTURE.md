# Smart Retail Pro Azure Architecture

## Cloud Architecture

```text
Browser
  |
  v
Azure App Service
  |-- serves GUI from app/public
  |-- exposes /api endpoints
  |-- runs azure/web/azurePipeline.mjs
  |
  +--> Azure Data Lake Storage Gen2
  |      Source / Bronze / Silver / Gold / Reports / Metadata
  |
  +--> Azure SQL Database
  |      Dimensions / Facts / Aggregates / Views
  |
  +--> Application Insights
         Logs / metrics / diagnostics

Azure Data Factory
  |
  +--> WebActivity calls /api/operation/run
```

## Main Files

| File | Purpose |
| --- | --- |
| `azure/infra/main.bicep` | Creates Azure infrastructure |
| `azure/web/server.mjs` | Azure App Service API and GUI server |
| `azure/web/azurePipeline.mjs` | Cloud data pipeline |
| `azure/scripts/deploy.ps1` | Deployment automation |
| `README_AZURE_AR.md` | Arabic Azure deployment guide |

## Security Notes

- SQL connection string is stored as an App Service app setting.
- Storage account public access is disabled.
- Web app uses HTTPS only.
- SQL queries from the GUI are read-only.
- Key Vault is provisioned for future secret hardening.
