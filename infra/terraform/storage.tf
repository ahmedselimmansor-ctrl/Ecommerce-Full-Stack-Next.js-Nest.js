# Cloud Storage — product photography and static assets.
#
# The API never proxies uploads: it mints V4 signed PUT URLs and the browser
# writes straight to the bucket, so Cloud Run never handles image bytes.

resource "google_storage_bucket" "media" {
  name          = "${var.project_id}-${local.prefix}-media"
  location      = var.region
  force_destroy = false

  uniform_bucket_level_access = true
  public_access_prevention    = var.bucket_public_read ? "inherited" : "enforced"

  versioning {
    enabled = true
  }

  cors {
    origin = compact([
      "http://localhost:3000",
      var.custom_domain != "" ? "https://${var.custom_domain}" : "",
    ])
    method          = ["GET", "HEAD", "PUT", "OPTIONS"]
    response_header = ["Content-Type", "Content-Length", "ETag"]
    max_age_seconds = 3600
  }

  lifecycle_rule {
    condition {
      age                = 90
      with_state         = "ARCHIVED"
      num_newer_versions = 3
    }
    action {
      type = "Delete"
    }
  }

  # Images are immutable once uploaded (the object name contains a UUID), so
  # they can be cached aggressively at the CDN edge.
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  labels = local.common_labels

  depends_on = [google_project_service.required]
}

# Public read for product imagery. Disable `bucket_public_read` to serve
# everything through signed read URLs instead.
resource "google_storage_bucket_iam_member" "public_read" {
  count = var.bucket_public_read ? 1 : 0

  bucket = google_storage_bucket.media.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}
