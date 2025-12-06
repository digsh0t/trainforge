export interface Template {
  id: string;
  name: string;
  description: string;
  instance_type: string;
  gpu_type: string | null;
  vcpu: number;
  memory_gb: number;
  storage_gb: number;
  hourly_cost: number;
  features: string[];
}
