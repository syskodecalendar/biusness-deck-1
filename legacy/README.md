# Legacy migration package

`legacy-export.json` is the sanitized parsed export generated from the user-supplied MariaDB/phpMyAdmin dump. It intentionally excludes the old `users` table/password.

`validation-baseline.json` contains source totals for post-import reconciliation.

The original SQL dump is not included in the distributable ZIP because it contains a legacy password value. If you need to regenerate the JSON, privately place the original file at:

`legacy/syskodet_syskode_project.sql`

Then run:

```bash
npm run legacy:export
```

Do not commit the original SQL to source control.
