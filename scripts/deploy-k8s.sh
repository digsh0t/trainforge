#!/bin/bash
# =============================================================================
# TrainForge Kubernetes Deployment Script
# =============================================================================
# This script helps deploy TrainForge to a bare metal Kubernetes cluster
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="trainforge"
REGISTRY="${REGISTRY:-}"  # Set to your private registry if you have one, e.g., "192.168.1.100:5000"
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}                    TrainForge Kubernetes Deployment                         ${NC}"
echo -e "${BLUE}==============================================================================${NC}"

# Function to print step
step() {
    echo -e "\n${GREEN}[STEP]${NC} $1"
}

# Function to print warning
warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Function to print error
error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    step "Checking prerequisites..."
    
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        error "docker is not installed"
        exit 1
    fi
    
    # Check if cluster is accessible
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    echo -e "${GREEN}✓ All prerequisites met${NC}"
}

# Build Docker images
build_images() {
    step "Building Docker images..."
    
    cd "$(dirname "$0")/.."
    
    # Build backend
    echo "Building backend image..."
    docker build -t trainforge-backend:${IMAGE_TAG} ./web/backend
    
    # Build frontend
    echo "Building frontend image..."
    docker build -t trainforge-frontend:${IMAGE_TAG} ./web/frontend
    
    echo -e "${GREEN}✓ Images built successfully${NC}"
}

# Push images to registry (if using a private registry)
push_images() {
    if [ -n "$REGISTRY" ]; then
        step "Pushing images to registry: $REGISTRY"
        
        docker tag trainforge-backend:${IMAGE_TAG} ${REGISTRY}/trainforge-backend:${IMAGE_TAG}
        docker tag trainforge-frontend:${IMAGE_TAG} ${REGISTRY}/trainforge-frontend:${IMAGE_TAG}
        
        docker push ${REGISTRY}/trainforge-backend:${IMAGE_TAG}
        docker push ${REGISTRY}/trainforge-frontend:${IMAGE_TAG}
        
        echo -e "${GREEN}✓ Images pushed to registry${NC}"
    else
        warn "No registry specified. Images will need to be available on cluster nodes."
        warn "For bare metal clusters, you may need to:"
        warn "  1. Set up a private registry"
        warn "  2. Use 'docker save' and 'docker load' on each node"
        warn "  3. Use a tool like 'kind load' or similar"
    fi
}

# Load images to cluster nodes (for bare metal without registry)
load_images_to_nodes() {
    step "Instructions for loading images to bare metal nodes..."
    
    echo ""
    echo "Since you're using a bare metal cluster without a registry, you need to"
    echo "load the Docker images on each worker node. Here are your options:"
    echo ""
    echo "Option 1: Save and load images manually"
    echo "  # On your local machine:"
    echo "  docker save trainforge-backend:${IMAGE_TAG} -o trainforge-backend.tar"
    echo "  docker save trainforge-frontend:${IMAGE_TAG} -o trainforge-frontend.tar"
    echo ""
    echo "  # Copy to each worker node and load:"
    echo "  scp trainforge-*.tar kubeuser@k8sworker1:~/"
    echo "  scp trainforge-*.tar kubeuser@k8sworker2:~/"
    echo ""
    echo "  # On each worker node:"
    echo "  sudo ctr -n k8s.io images import trainforge-backend.tar"
    echo "  sudo ctr -n k8s.io images import trainforge-frontend.tar"
    echo ""
    echo "Option 2: Set up a private Docker registry on your cluster"
    echo "  See: https://kubernetes.io/docs/tasks/administer-cluster/setup-private-registry/"
    echo ""
}

# Deploy to Kubernetes
deploy() {
    step "Deploying to Kubernetes..."
    
    cd "$(dirname "$0")/../k8s"
    
    # Create namespace
    echo "Creating namespace..."
    kubectl apply -f namespace.yaml
    
    # Apply secrets (reminder to update)
    warn "Remember to update secrets.yaml with your actual credentials before deploying!"
    kubectl apply -f secrets.yaml
    
    # Apply configmap
    kubectl apply -f configmap.yaml
    
    # Deploy PostgreSQL
    echo "Deploying PostgreSQL..."
    kubectl apply -f postgres.yaml
    
    # Wait for PostgreSQL to be ready
    echo "Waiting for PostgreSQL to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres -n ${NAMESPACE} --timeout=120s
    
    # Deploy Backend
    echo "Deploying Backend..."
    kubectl apply -f backend.yaml
    
    # Deploy Frontend
    echo "Deploying Frontend..."
    kubectl apply -f frontend.yaml
    
    # Deploy Ingress/NodePort services
    echo "Deploying Ingress and NodePort services..."
    kubectl apply -f ingress.yaml
    
    echo -e "${GREEN}✓ Deployment complete${NC}"
}

# Check deployment status
check_status() {
    step "Checking deployment status..."
    
    echo ""
    echo "Pods:"
    kubectl get pods -n ${NAMESPACE}
    
    echo ""
    echo "Services:"
    kubectl get svc -n ${NAMESPACE}
    
    echo ""
    echo "Deployments:"
    kubectl get deployments -n ${NAMESPACE}
}

# Print access information
print_access_info() {
    step "Access Information"
    
    echo ""
    echo "=== NodePort Access (Direct) ==="
    echo "Frontend: http://<any-node-ip>:30030"
    echo "Backend API: http://<any-node-ip>:30080"
    echo ""
    echo "Your node IPs:"
    kubectl get nodes -o wide | awk '{print $1, $6}'
    echo ""
    echo "=== Ingress Access (if NGINX Ingress Controller is installed) ==="
    echo "Add these to your /etc/hosts file:"
    echo "  <node-ip>  trainforge.local api.trainforge.local"
    echo ""
    echo "Then access:"
    echo "  Frontend: http://trainforge.local"
    echo "  Backend API: http://api.trainforge.local"
}

# Main menu
show_menu() {
    echo ""
    echo "What would you like to do?"
    echo "1) Full deployment (build + deploy)"
    echo "2) Build images only"
    echo "3) Deploy to cluster only (images must exist)"
    echo "4) Check deployment status"
    echo "5) Show access information"
    echo "6) Delete deployment"
    echo "7) Exit"
    echo ""
    read -p "Enter choice [1-7]: " choice
    
    case $choice in
        1)
            check_prerequisites
            build_images
            load_images_to_nodes
            read -p "Press enter when images are loaded on cluster nodes..."
            deploy
            check_status
            print_access_info
            ;;
        2)
            build_images
            load_images_to_nodes
            ;;
        3)
            deploy
            check_status
            print_access_info
            ;;
        4)
            check_status
            ;;
        5)
            print_access_info
            ;;
        6)
            step "Deleting TrainForge deployment..."
            kubectl delete namespace ${NAMESPACE} --ignore-not-found
            echo -e "${GREEN}✓ Deployment deleted${NC}"
            ;;
        7)
            exit 0
            ;;
        *)
            error "Invalid choice"
            show_menu
            ;;
    esac
}

# Run
show_menu
