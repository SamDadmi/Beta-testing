
export interface Module {
  id: string;
  title: string;
  category: string;
  description: string;
  thumbnail: string;
  difficulty: 'Basic' | 'Intermediate' | 'Advanced';
}

export interface SimulationStatus {
  id: string;
  name: string;
  status: 'Initiating' | 'Running' | 'Completed' | 'Failed';
  progress: number;
  cpuUsage: number;
  memoryUsage: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
