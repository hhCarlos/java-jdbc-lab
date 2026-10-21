FROM gvenzl/oracle-free:23.26.3-slim
COPY --chmod=755 infra/demo/init.sh /container-entrypoint-initdb.d/001-demo.sh
COPY infra/demo/schema.sql /opt/demo/schema.sql
COPY --chmod=755 infra/demo/ready.sh /opt/demo/ready.sh
COPY infra/database/setup.sql /opt/demo/setup.sql
COPY infra/database/tables /opt/demo/tables
