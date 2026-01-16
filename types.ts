
export enum View {
  Home = 'home',
  Consultation = 'consultation',
  Analysis = 'analysis',
  ContractGenerator = 'generator',
  Radar = 'radar',
  Research = 'research',
  Resources = 'resources',
  Contact = 'contact'
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface AnalysisResult {
  summary: string;
  risks: string[];
  recommendations: string[];
}

export interface OfficialResource {
  name: string;
  url: string;
  category: string;
}
