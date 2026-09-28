# ==============================================================================
#  STOCKSLING — Terraform Production Blueprint (AWS Infrastructure)
#  Usa este archivo para provisionar de forma elástica toda la arquitectura.
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ── VARIABLES ─────────────────────────────────────────────────────────────────
variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

variable "environment" {
  type    = string
  default = "production"
}

# ── 1. REDES (VPC con subredes públicas y privadas) ──────────────────────────
resource "aws_vpc" "stocksling_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "stocksling-${var.environment}-vpc"
    Environment = var.environment
  }
}

# Subredes en Zona A y B para Alta Disponibilidad (Multi-AZ)
resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.stocksling_vpc.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "${var.aws_region}a"
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.stocksling_vpc.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "${var.aws_region}b"
}

resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.stocksling_vpc.id
  cidr_block              = "10.0.10.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.stocksling_vpc.id
  cidr_block              = "10.0.11.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = true
}

# NAT Gateway para que los Workers privados salgan a internet
resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.stocksling_vpc.id
}

resource "aws_nat_gateway" "nat_gw" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_a.id
  depends_on    = [aws_internet_gateway.igw]
}

# ── 2. CAPA DE DATOS (Amazon Aurora Serverless v2 PostgreSQL) ─────────────────
resource "aws_db_subnet_group" "db_subnets" {
  name       = "stocksling-${var.environment}-db-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]
}

resource "aws_rds_cluster" "aurora_postgres" {
  cluster_identifier      = "stocksling-${var.environment}-postgres-cluster"
  engine                  = "aurora-postgresql"
  engine_version          = "16.1"
  database_name           = "stocksling"
  master_username         = "stocksling_master"
  master_password         = "SecureRandomPassWord2026_Enterprise" # Cambiar en producción
  db_subnet_group_name    = aws_db_subnet_group.db_subnets.name
  skip_final_snapshot     = true
  storage_encrypted       = true

  serverlessv2_scaling_configuration {
    min_capacity = 0.5   # Escala a 0.5 ACU en inactividad (~$22 USD/mes)
    max_capacity = 16.0  # Escala a 16 ACU durante picos masivos de 50k usuarios
  }
}

resource "aws_rds_cluster_instance" "aurora_instances" {
  count              = 2  # Multi-AZ activo-pasivo para tolerancia total a fallos
  identifier         = "stocksling-${var.environment}-postgres-instance-${count.index}"
  cluster_identifier = aws_rds_cluster.aurora_postgres.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.aurora_postgres.engine
  engine_version     = aws_rds_cluster.aurora_postgres.engine_version
}

# ── 3. CAPA DE CACHÉ Y COLAS (Amazon ElastiCache Redis Cluster) ───────────────
resource "aws_elasticache_subnet_group" "redis_subnets" {
  name       = "stocksling-${var.environment}-redis-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]
}

resource "aws_elasticache_replication_group" "redis_cluster" {
  replication_group_id          = "stocksling-redis"
  replication_group_description = "Redis Cluster con Multi-AZ para colas de Celery"
  node_type                     = "cache.t4g.medium" # Nodos económicos pero rápidos
  port                          = 6379
  parameter_group_name          = "default.redis7"
  subnet_group_name             = aws_elasticache_subnet_group.redis_subnets.name
  automatic_failover_enabled    = true
  multi_az_enabled              = true
  num_cache_clusters            = 2 # 1 Primario + 1 Réplica de lectura/failover
}

# ── 4. CLÚSTER DE CÓMPUTO (Amazon EKS - Kubernetes) ───────────────────────────
resource "aws_iam_role" "eks_cluster_role" {
  name = "stocksling-${var.environment}-eks-cluster-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster_role.name
}

resource "aws_eks_cluster" "eks" {
  name     = "stocksling-${var.environment}-eks-cluster"
  role_arn = aws_iam_role.eks_cluster_role.arn

  vpc_config {
    subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  }

  depends_on = [aws_iam_role_policy_attachment.eks_policy]
}

# ── 5. ALMACENAMIENTO ELÁSTICO (AWS S3 Bucket) ───────────────────────────────
resource "aws_s3_bucket" "uploads_bucket" {
  bucket        = "stocksling-${var.environment}-uploads"
  force_destroy = false
}

resource "aws_s3_bucket_cors_configuration" "cors" {
  bucket = aws_s3_bucket.uploads_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "GET", "HEAD"]
    allowed_origins = ["https://app.stocksling.app", "http://localhost:5173"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# ── SALIDAS DE PROVISIONAMIENTO (Outputs) ─────────────────────────────────────
output "aurora_endpoint" {
  value       = aws_rds_cluster.aurora_postgres.endpoint
  description = "Dirección DNS del pooler Aurora PostgreSQL"
}

output "redis_endpoint" {
  value       = aws_elasticache_replication_group.redis_cluster.primary_endpoint_address
  description = "Dirección DNS de conexión de Redis para la cola"
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.uploads_bucket.bucket
  description = "Nombre del bucket de subida directa"
}
