locals {
  # Until CI has pushed a real image, deploy a placeholder so the service (and
  # its URL) exists and the load balancer can be wired up.
  placeholder_image = "us-docker.pkg.dev/cloudrun/container/hello"

  backend_image  = var.backend_image != "" ? var.backend_image : local.placeholder_image
  frontend_image = var.frontend_image != "" ? var.frontend_image : local.placeholder_image

  site_url = var.custom_domain != "" ? "https://${var.custom_domain}" : ""

  # When the load balancer is the only intended entry point, lock both services
  # down so nobody can bypass Cloud Armor by hitting the run.app URL directly.
  ingress = var.lb_only_ingress ? "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER" : "INGRESS_TRAFFIC_ALL"

  # Direct service-to-service by default (one hop, no DNS dependency); through
  # the load balancer once the run.app URLs are closed.
  api_base_url = var.lb_only_ingress ? "${local.site_url}/api/v1" : "${google_cloud_run_v2_service.backend.uri}/api/v1"
}

# ---- API ---------------------------------------------------------------------

resource "google_cloud_run_v2_service" "backend" {
  name     = "${local.prefix}-api"
  location = var.region
  ingress  = local.ingress

  deletion_protection = false
  labels              = local.common_labels

  template {
    service_account = google_service_account.backend.email

    scaling {
      min_instance_count = var.backend_min_instances
      max_instance_count = var.backend_max_instances
    }

    # Private egress only for RFC1918 destinations keeps external calls on Cloud
    # NAT while Cloud SQL and Redis stay on the connector.
    vpc_access {
      connector = google_vpc_access_connector.serverless.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    max_instance_request_concurrency = 80
    timeout                          = "60s"

    containers {
      image = local.backend_image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        # CPU is only allocated while a request is in flight, which is the
        # cheaper mode for a request/response API.
        cpu_idle          = true
        startup_cpu_boost = true
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "API_PREFIX"
        value = "api/v1"
      }
      env {
        name  = "CURRENCY"
        value = var.currency
      }
      # Browser traffic reaches the API through the storefront's BFF route, so
      # this list only matters for direct third-party clients.
      env {
        name  = "CORS_ORIGINS"
        value = local.site_url
      }
      env {
        name  = "REDIS_HOST"
        value = google_redis_instance.cache.host
      }
      env {
        name  = "REDIS_PORT"
        value = tostring(google_redis_instance.cache.port)
      }
      env {
        name  = "REDIS_TLS"
        value = "true"
      }
      env {
        name  = "GCS_BUCKET"
        value = google_storage_bucket.media.name
      }
      env {
        name  = "GCS_PUBLIC_BASE_URL"
        value = "https://storage.googleapis.com/${google_storage_bucket.media.name}"
      }
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      dynamic "env" {
        for_each = {
          DATABASE_URL       = "database-url"
          JWT_ACCESS_SECRET  = "jwt-access-secret"
          JWT_REFRESH_SECRET = "jwt-refresh-secret"
          REDIS_PASSWORD     = "redis-password"
        }

        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.app[env.value].secret_id
              version = "latest"
            }
          }
        }
      }

      startup_probe {
        http_get {
          path = "/api/v1/health"
        }
        initial_delay_seconds = 5
        period_seconds        = 5
        failure_threshold     = 6
        timeout_seconds       = 3
      }

      liveness_probe {
        http_get {
          path = "/api/v1/health"
        }
        period_seconds    = 30
        failure_threshold = 3
        timeout_seconds   = 3
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_secret_manager_secret_version.app,
    google_secret_manager_secret_iam_member.backend_secrets,
  ]

  lifecycle {
    # CI deploys new revisions; Terraform must not roll the image back.
    ignore_changes = [template[0].containers[0].image, client, client_version]
  }
}

# ---- storefront --------------------------------------------------------------

resource "google_cloud_run_v2_service" "frontend" {
  name     = "${local.prefix}-web"
  location = var.region
  ingress  = local.ingress

  deletion_protection = false
  labels              = local.common_labels

  template {
    service_account = google_service_account.frontend.email

    scaling {
      min_instance_count = var.frontend_min_instances
      max_instance_count = var.frontend_max_instances
    }

    max_instance_request_concurrency = 100
    timeout                          = "30s"

    containers {
      image = local.frontend_image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      # Server-side only: the browser never sees this value. When the API is
      # locked to load-balancer ingress, the storefront has to go through the
      # load balancer too — the run.app URL is closed at that point.
      env {
        name  = "API_URL"
        value = local.api_base_url
      }
      env {
        name  = "NODE_ENV"
        value = "production"
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  lifecycle {
    ignore_changes = [template[0].containers[0].image, client, client_version]
  }
}

# ---- public access -----------------------------------------------------------
# Both services are internet-facing (or LB-facing). Authorisation is the app's
# job — the API authenticates with JWTs, not with Cloud Run IAM.

resource "google_cloud_run_v2_service_iam_member" "backend_public" {
  location = google_cloud_run_v2_service.backend.location
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "frontend_public" {
  location = google_cloud_run_v2_service.frontend.location
  name     = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
