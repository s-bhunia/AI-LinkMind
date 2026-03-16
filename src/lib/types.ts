export type SavedLink = {
  id: string;
  url: string;
  title: string;
  description: string;
  creatorName: string;
  category: string;
  thumbnailUrl: string;
  platform: string;
  createdAt: string;
};

export type CategorizationResult = {
  title: string;
  description: string;
  creatorName: string;
  category: string;
  confidence: number;
  thumbnailUrl: string;
  platform: string;
};