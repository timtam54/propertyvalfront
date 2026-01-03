# Development Rules - CRITICAL

## 1. Never Push to Git Without Review
- All code changes must be reviewed manually before committing
- Do not auto-deploy to Azure
- Run `git diff` to review all changes before any commit

## 2. Never Hardcode Data
- Hardcoded data is incorrect data
- Incorrect results are disastrous to the legitimacy of the app
- All values must come from:
  - API responses
  - Database queries
  - User input
  - Real-time calculations

## Examples of What NOT to Do
- Do not include example dollar amounts in AI prompts (e.g., "$1,450,000 - $1,580,000")
- Do not use placeholder values that could be mistaken for real data
- Do not copy/paste sample data into production code

## Data Sources
- **RP Data**: Real property data from RP Data API reports
- **Homely**: Real comparable sales data scraped from Homely
- **AI Calculations**: Must be based on real input data only

## Verification
- Always test that displayed values match the actual source data
- Cross-check header values against report body values
- Ensure selected data source (Homely vs RP Data) is actually being used
