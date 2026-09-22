import type { MotionConfig } from "./types";

export type LayoutCategory = "canonico" | "promocional" | "sazonal" | "custom";

export interface MotionLayout {
  id: string;
  name: string;
  description?: string;
  category: LayoutCategory;
  config: MotionConfig;
  thumbnailUrl?: string;
  isSystem?: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MotionPublication {
  id: string;
  storeId: string;
  sector: string;
  layoutId: string | null;
  layoutName: string;
  publishedConfig: MotionConfig;
  publishedVersion: number;
  publishedAt: string;
  publishedBy?: string;
}

export interface CreateLayoutInput {
  name: string;
  description?: string;
  category?: LayoutCategory;
  config?: MotionConfig;
  baseLayoutId?: string;
}

export interface UpdateLayoutInput {
  name?: string;
  description?: string;
  category?: LayoutCategory;
  config?: MotionConfig;
}

export interface PublishLayoutInput {
  sector: string;
  layoutId?: string;
  layoutName?: string;
  configToPublish: MotionConfig;
  storeId?: string;
  publishedBy?: string;
}

