export interface ImageItem {
  name: string;
  uri: string;
  thumb: string | null;
  isVideo: boolean;
  size?: number;
  dimensions?: { width: number; height: number };
  uploadDate?: string;
}

export type SortType = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc' | 'size-asc' | 'size-desc' | 'default';
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
  onDownload: (uri: string, name: string) => void;
  onShare: (uri: string, name: string) => void;
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
  onDownload: (uri: string, name: string) => void;
  onShare: (uri: string, name: string) => void;
  theme: any;
}