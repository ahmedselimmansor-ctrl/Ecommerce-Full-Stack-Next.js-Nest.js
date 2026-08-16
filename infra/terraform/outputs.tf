output "backend_url" {
  description = "Cloud Run URL of the API."
  value       = google_cloud_run_v2_service.backend.uri
}

output "frontend_url" {
  description = "Cloud Run URL of the storefront."
  value       = google_cloud_run_v2_service.frontend.uri
}

output "load_balancer_ip" {
  description = "Point an A record for the custom domain at this address."
  value       = local.lb_enabled ? google_compute_global_address.lb[0].address : null
}

output "artifact_registry_repo" {
  description = "Docker repository to push images to."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.containers.repository_id}"
}

output "database_instance" {
  description = "Cloud SQL connection name, used by the Cloud SQL Auth Proxy."
  value       = google_sql_database_instance.main.connection_name
}

output "database_private_ip" {
  value = google_sql_database_instance.main.private_ip_address
}

output "database_replica_connection_name" {
  value = var.enable_read_replica ? google_sql_database_instance.replica[0].connection_name : null
}

output "redis_host" {
  value = google_redis_instance.cache.host
}

output "redis_port" {
  value = google_redis_instance.cache.port
}

output "media_bucket" {
  value = google_storage_bucket.media.name
}

output "backend_service_account" {
  value = google_service_account.backend.email
}

output "frontend_service_account" {
  value = google_service_account.frontend.email
}

output "deployer_service_account" {
  description = "Bind this to a Workload Identity pool for GitHub Actions."
  value       = google_service_account.deployer.email
}

output "vpc_connector" {
  value = google_vpc_access_connector.serverless.id
}

# Printed only so the first `prisma migrate deploy` can be run through the Cloud
# SQL Auth Proxy. Read with: terraform output -raw database_password
output "database_password" {
  value     = random_password.db.result
  sensitive = true
}
