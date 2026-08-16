# Secret Manager. Cloud Run mounts these as environment variables at start-up,
# so no secret value is ever stored in a service definition or an image layer.

resource "random_password" "jwt_access" {
  length  = 48
  special = false
}

resource "random_password" "jwt_refresh" {
  length  = 48
  special = false
}

locals {
  # Private-IP connection string. The password is URL-encoded because it may
  # contain characters that are otherwise meaningful in a URI.
  database_url = format(
    "postgresql://%s:%s@%s:5432/%s?schema=public",
    var.db_user,
    urlencode(random_password.db.result),
    google_sql_database_instance.main.private_ip_address,
    var.db_name,
  )

  secrets = {
    database-url       = local.database_url
    jwt-access-secret  = random_password.jwt_access.result
    jwt-refresh-secret = random_password.jwt_refresh.result
    redis-password     = google_redis_instance.cache.auth_string
  }
}

resource "google_secret_manager_secret" "app" {
  for_each = local.secrets

  secret_id = "${local.prefix}-${each.key}"
  labels    = local.common_labels

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "app" {
  for_each = local.secrets

  secret      = google_secret_manager_secret.app[each.key].id
  secret_data = each.value
}
