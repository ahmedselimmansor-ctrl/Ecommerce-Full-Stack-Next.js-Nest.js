locals {
  prefix = "${var.app_name}-${var.environment}"

  common_labels = {
    app         = var.app_name
    environment = var.environment
    managed-by  = "terraform"
  }
}

# ---- API enablement ----------------------------------------------------------
# Every downstream resource depends on these, so they are enabled first and are
# deliberately not disabled on destroy (other workloads may rely on them).

resource "google_project_service" "required" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "redis.googleapis.com",
    "storage.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "vpcaccess.googleapis.com",
    "servicenetworking.googleapis.com",
    "compute.googleapis.com",
    "cloudbuild.googleapis.com",
    "iamcredentials.googleapis.com",
  ])

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

# ---- container registry ------------------------------------------------------

resource "google_artifact_registry_repository" "containers" {
  location      = var.region
  repository_id = local.prefix
  description   = "Container images for the ${var.app_name} storefront"
  format        = "DOCKER"
  labels        = local.common_labels

  # Keep storage costs flat: only the last 10 untagged images survive.
  cleanup_policies {
    id     = "keep-recent-untagged"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }

  cleanup_policies {
    id     = "delete-old-untagged"
    action = "DELETE"
    condition {
      tag_state  = "UNTAGGED"
      older_than = "604800s" # 7 days
    }
  }

  depends_on = [google_project_service.required]
}
