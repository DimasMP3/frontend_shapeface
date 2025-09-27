export type PredictionResponse = {
  shape: string;
  confidence: number;
};

export type ErrorResponse = {
  error?: string;
};

export type Orientation = "front" | "left" | "right";
export type ScanStep = Orientation | "finished";

export type FaceMetrics = {
  detectionScore: number;
  centerScore: number;
  sizeScore: number;
  overallScore: number;
  timestamp: number;
};

export type StepContent = {
  badge: string;
  title: string;
  description: string;
};