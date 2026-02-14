export interface ImageItem {
  name: string;
  uri: string;
  thumb: string | null;
  isVideo: boolean;
  size?: number;
  dimensions?: { width: number; height: number };
  uploadDate?: string;
  mimeType?: string;
  duration?: number;
  hash?: string;
}

export type SortType =
  | 'default'
  | 'name-asc'
  | 'name-desc'
  | 'date-asc'
  | 'date-desc'
  | 'size-asc'
  | 'size-desc'
  | 'width-asc'
  | 'width-desc'
  | 'height-asc'
  | 'height-desc'
  | 'duration-asc'
  | 'duration-desc';

export type FilterType = 'all' | 'images' | 'videos';

export type ViewMode = 'grid' | 'list';

export interface ImageCardProps {
  image: ImageItem;
  index: number;
  viewMode: ViewMode;
  isFavorite: boolean;
  videoThumbnail?: string;
  columns?: number;
  onOpen: (index: number) => void;
  onToggleFavorite: (name: string) => void;
  onDownload: (uri: string, name: string) => void | Promise<void>;
  onShare: (uri: string, name: string) => void | Promise<void>;
  theme: Record<string, string>;
}

export interface ModalViewerProps {
  visible: boolean;
  images: ImageItem[];
  currentIndex: number;
  favorites: Set<string>;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleFavorite: (name: string) => void;
  onDownload: (uri: string, name: string) => void | Promise<void>;
  onShare: (uri: string, name: string) => void | Promise<void>;
  onLoadMore?: () => void;
  theme: Record<string, string>;
}

export interface AppTheme {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  accentHover: string;
  cardBackground: string;
  overlay: string;
}