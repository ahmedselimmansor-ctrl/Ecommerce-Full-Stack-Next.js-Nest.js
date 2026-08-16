# Cloud SQL for PostgreSQL — private IP only, reachable from Cloud Run through
# the Serverless VPC Access connector.

resource "random_password" "db" {
  length  = 32
  special = true
  # Excluded because these characters need escaping inside a DATABASE_URL.
  override_special = "!#%*_-+="
}

resource "google_sql_database_instance" "main" {
  name             = "${local.prefix}-pg"
  database_version = "POSTGRES_16"
  region           = var.region

  deletion_protection = var.db_deletion_protection

  settings {
    tier              = var.db_tier
    availability_type = var.db_availability_type
    disk_type         = "PD_SSD"
    disk_size         = 20
    disk_autoresize   = true
    edition           = "ENTERPRISE"

    ip_configuration {
      # No public IP: the only path in is the VPC.
      ipv4_enabled                                  = false
      private_network                               = google_compute_network.vpc.id
      enable_private_path_for_google_cloud_services = true
      ssl_mode                                      = "ENCRYPTED_ONLY"
    }

    backup_configuration {
      enabled                        = true
      start_time                     = "02:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 14
        retention_unit   = "COUNT"
      }
    }

    maintenance_window {
      day          = 7 # Sunday
      hour         = 3
      update_track = "stable"
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
    }

    database_flags {
      name  = "max_connections"
      value = "200"
    }

    # Log statements slower than 500ms so slow queries surface in Cloud Logging.
    database_flags {
      name  = "log_min_duration_statement"
      value = "500"
    }

    user_labels = local.common_labels
  }

  depends_on = [google_service_networking_connection.private_vpc]
}

# Read replica. Reporting and any read-heavy analytics should point here so the
# primary is left to serve checkout traffic.
resource "google_sql_database_instance" "replica" {
  count = var.enable_read_replica ? 1 : 0

  name                 = "${local.prefix}-pg-replica"
  database_version     = "POSTGRES_16"
  region               = var.region
  master_instance_name = google_sql_database_instance.main.name

  deletion_protection = false

  replica_configuration {
    failover_target = false
  }

  settings {
    tier              = var.db_tier
    availability_type = "ZONAL"
    disk_type         = "PD_SSD"
    disk_autoresize   = true
    edition           = "ENTERPRISE"

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
      ssl_mode        = "ENCRYPTED_ONLY"
    }

    user_labels = local.common_labels
  }

  depends_on = [google_service_networking_connection.private_vpc]
}

resource "google_sql_database" "app" {
  name     = var.db_name
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "app" {
  name     = var.db_user
  instance = google_sql_database_instance.main.name
  password = random_password.db.result
}
