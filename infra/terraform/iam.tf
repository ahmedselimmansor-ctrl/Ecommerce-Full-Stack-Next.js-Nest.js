# One service account per service, each with only the roles it actually uses.

resource "google_service_account" "backend" {
  account_id   = "${local.prefix}-api"
  display_name = "${var.app_name} API (Cloud Run)"
}

resource "google_service_account" "frontend" {
  account_id   = "${local.prefix}-web"
  display_name = "${var.app_name} storefront (Cloud Run)"
}

# ---- backend permissions -----------------------------------------------------

resource "google_project_iam_member" "backend_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_secret_manager_secret_iam_member" "backend_secrets" {
  for_each = google_secret_manager_secret.app

  secret_id = each.value.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend.email}"
}

# Read/write on the media bucket only — not project-wide storage admin.
resource "google_storage_bucket_iam_member" "backend_media" {
  bucket = google_storage_bucket.media.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.backend.email}"
}

# Signing V4 URLs without a downloaded key requires the service account to be
# able to call signBlob on itself.
resource "google_service_account_iam_member" "backend_token_creator" {
  service_account_id = google_service_account.backend.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.backend.email}"
}

# ---- deploy identity (GitHub Actions via Workload Identity Federation) --------

resource "google_service_account" "deployer" {
  account_id   = "${local.prefix}-deployer"
  display_name = "${var.app_name} CI/CD deployer"
}

resource "google_project_iam_member" "deployer_roles" {
  for_each = toset([
    "roles/run.admin",
    "roles/artifactregistry.writer",
    "roles/cloudsql.client",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

# Required so the deployer can deploy a revision that *runs as* the app
# service accounts.
resource "google_service_account_iam_member" "deployer_act_as_backend" {
  service_account_id = google_service_account.backend.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_service_account_iam_member" "deployer_act_as_frontend" {
  service_account_id = google_service_account.frontend.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deployer.email}"
}
