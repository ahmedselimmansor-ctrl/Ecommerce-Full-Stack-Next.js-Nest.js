# Private networking.
#
# Cloud SQL and Memorystore both sit on private IPs inside this VPC. Cloud Run is
# serverless and has no VPC presence of its own, so a Serverless VPC Access
# connector bridges the two. Nothing in the data tier is reachable from the
# internet.

resource "google_compute_network" "vpc" {
  name                    = "${local.prefix}-vpc"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.required]
}

resource "google_compute_subnetwork" "main" {
  name                     = "${local.prefix}-subnet"
  ip_cidr_range            = "10.10.0.0/24"
  region                   = var.region
  network                  = google_compute_network.vpc.id
  private_ip_google_access = true
}

# Dedicated /28 for the connector — it must not overlap the main subnet.
resource "google_vpc_access_connector" "serverless" {
  name          = "${local.prefix}-conn"
  region        = var.region
  network       = google_compute_network.vpc.name
  ip_cidr_range = "10.10.1.0/28"

  min_instances = 2
  max_instances = 6
  machine_type  = "e2-micro"

  depends_on = [google_project_service.required]
}

# ---- private services access (Cloud SQL / Memorystore peering) ---------------

resource "google_compute_global_address" "private_ip_range" {
  name          = "${local.prefix}-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]

  depends_on = [google_project_service.required]
}

# Cloud NAT lets the private subnet reach the internet for outbound calls
# (payment gateways, email) without giving anything a public IP.
resource "google_compute_router" "router" {
  name    = "${local.prefix}-router"
  region  = var.region
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "nat" {
  name                               = "${local.prefix}-nat"
  router                             = google_compute_router.router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}
