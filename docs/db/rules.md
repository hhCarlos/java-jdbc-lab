# Database rules

Read docs/db/schema.dml before changing the database schema, migrations, initialization scripts, or SQL persistence code.

The ERD defines the agreed database model.

- Keep tables, columns, types, relationships, constraints, and indexes consistent with the ERD.
- Do not introduce schema changes outside the requested scope.
- When an authorized task changes the model, update the ERD, migration, dev initialization, and relevant tests together.
- Preserve existing data unless the task explicitly requests its removal.
- If the ERD, database scripts, or actual database disagree, report the discrepancy before changing the affected structure. Do not silently overwrite one to match another.
- Summarize model changes and verification results in the final report.

Tasks unrelated to database structure or persistence do not require reading these documents.
