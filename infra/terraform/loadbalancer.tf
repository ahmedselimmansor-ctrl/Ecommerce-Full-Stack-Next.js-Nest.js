# Global external HTTPS load balancer in front of both Cloud Run services.
#
#   users → HTTPS LB (Cloud Armor + Cloud CDN)
#             ├── /api/*  → Cloud Run: API      (no CDN — responses are per-user)
#             └── /*      → Cloud Run: frontend (CDN on, Next.js sets the headers)
#
# Enable with `enable_load_balancer = true` and a `custom_domain`. Until DNS
# points at the reserved address the managed certificate stays PROVISIONING.

locals {
  lb_enabled = var.enable_load_balancer && var.custom_domain != ""
}

# ---- serverless network endpoint groups --------------------------------------

resource "google_compute_region_network_endpoint_group" "frontend" {
  count = local.lb_enabled ? 1 : 0

  name                  = "${local.prefix}-web-neg"
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = google_cloud_run_v2_service.frontend.name
  }
}

resource "google_compute_region_network_endpoint_group" "backend" {
  count = local.lb_enabled ? 1 : 0

  name                  = "${local.prefix}-api-neg"
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = google_cloud_run_v2_service.backend.name
  }
}

# ---- Cloud Armor -------------------------------------------------------------

resource "google_compute_security_policy" "waf" {
  count = local.lb_enabled ? 1 : 0

  name        = "${local.prefix}-waf"
  description = "Rate limiting and OWASP protection for the storefront"

  # Per-IP throttling. Applied before the WAF rules so a flood is cheap to drop.
  rule {
    action   = "rate_based_ban"
    priority = 1000

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }

    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"

      rate_limit_threshold {
        count        = var.waf_rate_limit_per_minute
        interval_sec = 60
      }

      ban_duration_sec = 300
    }

    description = "Throttle abusive clients"
  }

  # Tighter budget on the auth endpoints — credential stuffing looks like normal
  # traffic volume-wise, but never targets only /auth.
  rule {
    action   = "rate_based_ban"
    priority = 900

    match {
      expr {
        expression = "request.path.matches('/api/v1/auth/')"
      }
    }

    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"

      rate_limit_threshold {
        count        = 30
        interval_sec = 60
      }

      ban_duration_sec = 600
    }

    description = "Throttle authentication attempts"
  }

  rule {
    action   = "deny(403)"
    priority = 1100

    match {
      expr {
        expression = "evaluatePreconfiguredExpr('sqli-v33-stable')"
      }
    }

    description = "Block SQL injection patterns"
  }

  rule {
    action   = "deny(403)"
    priority = 1200

    match {
      expr {
        expression = "evaluatePreconfiguredExpr('xss-v33-stable')"
      }
    }

    description = "Block cross-site scripting patterns"
  }

  dynamic "rule" {
    for_each = length(var.waf_allowed_regions) > 0 ? [1] : []

    content {
      action   = "deny(403)"
      priority = 1300

      match {
        expr {
          expression = "!(origin.region_code in [${join(",", formatlist("'%s'", var.waf_allowed_regions))}])"
        }
      }

      description = "Geo restriction"
    }
  }

  rule {
    action   = "allow"
    priority = 2147483647

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }

    description = "Default allow"
  }
}

# ---- backend services --------------------------------------------------------

resource "google_compute_backend_service" "frontend" {
  count = local.lb_enabled ? 1 : 0

  name                  = "${local.prefix}-web-bes"
  protocol              = "HTTPS"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  security_policy       = google_compute_security_policy.waf[0].id

  backend {
    group = google_compute_region_network_endpoint_group.frontend[0].id
  }

  # Next.js emits its own Cache-Control per route (static assets immutable,
  # pages ISR-revalidated), so the CDN follows the origin rather than guessing.
  enable_cdn = true

  cdn_policy {
    cache_mode                   = "USE_ORIGIN_HEADERS"
    client_ttl                   = 3600
    negative_caching             = true
    serve_while_stale            = 86400
    signed_url_cache_max_age_sec = 0

    cache_key_policy {
      include_host         = true
      include_protocol     = true
      include_query_string = true
    }
  }

  log_config {
    enable      = true
    sample_rate = 0.1
  }
}

resource "google_compute_backend_service" "backend" {
  count = local.lb_enabled ? 1 : 0

  name                  = "${local.prefix}-api-bes"
  protocol              = "HTTPS"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  security_policy       = google_compute_security_policy.waf[0].id

  backend {
    group = google_compute_region_network_endpoint_group.backend[0].id
  }

  # No CDN: API responses are either user-specific or already cached in Redis.
  enable_cdn = false

  log_config {
    enable      = true
    sample_rate = 1.0
  }
}

# ---- routing -----------------------------------------------------------------

resource "google_compute_url_map" "main" {
  count = local.lb_enabled ? 1 : 0

  name            = "${local.prefix}-urlmap"
  default_service = google_compute_backend_service.frontend[0].id

  host_rule {
    hosts        = [var.custom_domain]
    path_matcher = "storefront"
  }

  path_matcher {
    name            = "storefront"
    default_service = google_compute_backend_service.frontend[0].id

    path_rule {
      paths   = ["/api/v1", "/api/v1/*"]
      service = google_compute_backend_service.backend[0].id
    }
  }
}

# ---- certificate and entry points --------------------------------------------

resource "google_compute_managed_ssl_certificate" "main" {
  count = local.lb_enabled ? 1 : 0

  name = "${local.prefix}-cert"

  managed {
    domains = [var.custom_domain]
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "google_compute_global_address" "lb" {
  count = local.lb_enabled ? 1 : 0

  name = "${local.prefix}-lb-ip"
}

resource "google_compute_target_https_proxy" "main" {
  count = local.lb_enabled ? 1 : 0

  name             = "${local.prefix}-https-proxy"
  url_map          = google_compute_url_map.main[0].id
  ssl_certificates = [google_compute_managed_ssl_certificate.main[0].id]
}

resource "google_compute_global_forwarding_rule" "https" {
  count = local.lb_enabled ? 1 : 0

  name                  = "${local.prefix}-https"
  target                = google_compute_target_https_proxy.main[0].id
  port_range            = "443"
  ip_address            = google_compute_global_address.lb[0].id
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# Port 80 exists only to redirect; no plaintext traffic ever reaches an origin.
resource "google_compute_url_map" "https_redirect" {
  count = local.lb_enabled ? 1 : 0

  name = "${local.prefix}-https-redirect"

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

resource "google_compute_target_http_proxy" "redirect" {
  count = local.lb_enabled ? 1 : 0

  name    = "${local.prefix}-http-proxy"
  url_map = google_compute_url_map.https_redirect[0].id
}

resource "google_compute_global_forwarding_rule" "http" {
  count = local.lb_enabled ? 1 : 0

  name                  = "${local.prefix}-http"
  target                = google_compute_target_http_proxy.redirect[0].id
  port_range            = "80"
  ip_address            = google_compute_global_address.lb[0].id
  load_balancing_scheme = "EXTERNAL_MANAGED"
}
