
export interface GeneratedSection {
  id: string;
  html: string;
  originalHtml: string; // Keeps the full version with bg/blobs
  name: string;
  description: string;
  timestamp: number;
  style?: string;
  isTransparent?: boolean; // Tracks current state
}

export interface GeneratedPage {
  sections: GeneratedSection[];
  overallStyle: string;
}

export interface SectionRequest {
  prompt: string;
  style?: string;
}

export enum ViewMode {
  PREVIEW = 'PREVIEW',
  CODE = 'CODE',
  WORDPRESS = 'WORDPRESS'
}

export enum GenerationType {
  SECTION = 'SECTION',
  FULL_PAGE = 'FULL_PAGE'
}
