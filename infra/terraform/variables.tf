variable "project_id" {
  description = "GCP project that hosts the storefront."
  type        = string
}

variable "region" {
  description = "Region for Cloud Run, Cloud SQL, Memorystore and Artifact Registry."
  type        = string
  default     = "europe-west1"
}

variable "app_name" {
  description = "Prefix applied to every resource name."
  type        = string
  default     = "atelier"
}

variable "environment" {
  description = "Deployment environment (prod, staging, dev)."
  type        = string
  default     = "prod"
}

# ---- Cloud SQL ---------------------------------------------------------------

variable "db_tier" {
  description = "Cloud SQL machine type. db-f1-micro is fine for a pilot; move to db-custom-2-7680 for real traffic."
  type        = string
  default     = "db-g1-small"
}

variable "db_name" {
  description = "Application database name."
  type        = string
  default     = "atelier"
}

variable "db_user" {
  description = "Application database user."
  type        = string
  default     = "atelier_app"
}

variable "db_availability_type" {
  description = "ZONAL for a single zone, REGIONAL for an HA pair with automatic failover."
  type        = string
  default     = "ZONAL"
}

variable "db_deletion_protection" {
  description = "Blocks `terraform destroy` from dropping the production database."
  type        = bool
  default     = true
}

# ---- Memorystore -------------------------------------------------------------

variable "redis_tier" {
  description = "BASIC (single node) or STANDARD_HA (replicated with automatic failover)."
  type        = string
  default     = "BASIC"
}

variable "redis_memory_gb" {
  description = "Memorystore capacity in GB."
  type        = number
  default     = 1
}

# ---- Cloud Run ---------------------------------------------------------------

variable "backend_image" {
  description = "Fully qualified backend image. Leave empty on the first apply; CI sets it afterwards."
  type        = string
  default     = ""
}

variable "frontend_image" {
  description = "Fully qualified frontend image. Leave empty on the first apply; CI sets it afterwards."
  type        = string
  default     = ""
}

variable "backend_min_instances" {
  description = "Keeping one warm instance removes cold starts from the checkout path."
  type        = number
  default     = 1
}

variable "backend_max_instances" {
  description = "Upper bound on backend instances. Each instance opens its own DB pool."
  type        = number
  default     = 10
}

variable "frontend_min_instances" {
  type    = number
  default = 0
}

variable "frontend_max_instances" {
  type    = number
  default = 20
}

# ---- application settings ----------------------------------------------------

variable "currency" {
  description = "ISO 4217 currency code used for pricing."
  type        = string
  default     = "EGP"
}

variable "custom_domain" {
  description = "Storefront domain, used for CORS and canonical URLs. Empty falls back to the Cloud Run URL."
  type        = string
  default     = ""
}

variable "bucket_public_read" {
  description = "Serve product imagery directly from the bucket. Disable to use signed read URLs only."
  type        = bool
  default     = true
}

variable "enable_read_replica" {
  description = "Provision a Cloud SQL read replica for reporting and read-heavy queries."
  type        = bool
  default     = false
}

# ---- edge (load balancer, CDN, WAF) ------------------------------------------

variable "enable_load_balancer" {
  description = "Front both Cloud Run services with a global HTTPS load balancer, Cloud CDN and Cloud Armor. Requires custom_domain."
  type        = bool
  default     = false
}

variable "lb_only_ingress" {
  description = "Close the run.app URLs so traffic can only arrive through the load balancer. Turn on after DNS and the certificate are live."
  type        = bool
  default     = false
}

variable "waf_rate_limit_per_minute" {
  description = "Cloud Armor per-IP request budget per minute before throttling."
  type        = number
  default     = 600
}

variable "waf_allowed_regions" {
  description = "ISO country codes allowed through Cloud Armor. Empty means no geo restriction."
  type        = list(string)
  default     = []
}
