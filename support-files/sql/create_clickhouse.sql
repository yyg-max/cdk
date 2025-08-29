CREATE DATABASE IF NOT EXISTS linux_do_cdk;

USE linux_do_cdk;

CREATE TABLE IF NOT EXISTS err_receive_logs
(
    timestamp          DateTime,
    trace_id           String,
    user_id            UInt64,
    user_name          String,
    project_id         String,
    project_start_time DateTime,
    project_end_time   DateTime,
    error_message      String DEFAULT '',
    client_info        String DEFAULT ''
) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (timestamp, user_id, project_id)
      SETTINGS index_granularity = 8192;
