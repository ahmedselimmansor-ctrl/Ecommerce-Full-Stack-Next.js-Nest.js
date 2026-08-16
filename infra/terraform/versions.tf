terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Store state in GCS so the team shares one source of truth.
  # Create the bucket first, then uncomment and run `terraform init -migrate-state`.
  # backend "gcs" {
  #   bucket = "atelier-tfstate"
  #   prefix = "prod"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
