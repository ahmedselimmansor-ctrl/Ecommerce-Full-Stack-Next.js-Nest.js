# Memorystore for Redis — product/category cache and the refresh-token store.
#
# The cache is intentionally non-durable: everything in it can be recomputed
# from PostgreSQL, and an eviction only costs one slower request. Refresh tokens
# are the exception, so persistence is enabled on the HA tier.

resource "google_redis_instance" "cache" {
  name           = "${local.prefix}-redis"
  tier           = var.redis_tier
  memory_size_gb = var.redis_memory_gb
  region         = var.region

  authorized_network = google_compute_network.vpc.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  redis_version           = "REDIS_7_0"
  display_name            = "${var.app_name} cache"
  auth_enabled            = true
  transit_encryption_mode = "SERVER_AUTHENTICATION"

  redis_configs = {
    # Evict the least recently used key rather than failing writes when full.
    maxmemory-policy = "allkeys-lru"
  }

  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 4
        minutes = 0
      }
    }
  }

  labels = local.common_labels

  depends_on = [
    google_project_service.required,
    google_service_networking_connection.private_vpc,
  ]
}
