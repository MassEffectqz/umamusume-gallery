import { useState, useEffect, useCallback, useRef } from 'react';
import { ImageItem } from '../types/index';

const SERVER_IP = '192.168.1.44';
const SERVER_PORT = 8000;
const SERVER_URL = `http://${SERVER_IP}:${SERVER_PORT}`;
const CACHE_DURATION = 5 * 60 * 1000;
const PAGE_SIZE = 50;

interface CachedData {
  images: ImageItem[];
  timestamp: number;
  lastPage: number;
}

export const useImages = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<CachedData | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      setServerStatus('checking');
      const response = await fetch(`${SERVER_URL}/api/images?page=1`, {
        headers: { 'Accept': 'application/json' },
      });
      if (response.ok) {
        setServerStatus('online');
        loadImages(1, true);
      } else {
        setServerStatus('offline');
        setLoading(false);
      }
    } catch {
      setServerStatus('offline');
      setLoading(false);
    }
  }, []);

  const loadImages = useCallback(async (page: number, isInitial = false) => {
    if (!isInitial) setLoadingMore(true);
    if (isInitial) setLoading(true);

    try {
      if (!isInitial && cacheRef.current) {
        const { images: cached, timestamp, lastPage } = cacheRef.current;
        if (page <= lastPage && Date.now() - timestamp < CACHE_DURATION) {
          setImages(cached);
          if (!isInitial) setLoadingMore(false);
          if (isInitial) setLoading(false);
          return;
        }
      }

      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      const response = await fetch(`${SERVER_URL}/api/images?page=${page}`, {
        signal: abortControllerRef.current.signal,
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      const newItems = data.map((item: any) => ({
        name: item.name,
        uri: `${SERVER_URL}${item.url}`,
        thumb: item.thumb ? `${SERVER_URL}${item.thumb}` : null,
        isVideo: item.isVideo || false,
        size: Math.floor(Math.random() * 5000000) + 1000000,
        uploadDate: new Date().toISOString(),
      }));

      setImages(prev => isInitial ? newItems : [...prev, ...newItems]);
      setHasMore(newItems.length === PAGE_SIZE);
      setCurrentPage(page);

      cacheRef.current = {
        images: isInitial ? newItems : [...(cacheRef.current?.images || []), ...newItems],
        timestamp: Date.now(),
        lastPage: Math.max(page, cacheRef.current?.lastPage || 1),
      };
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error('Load error:', err);
    } finally {
      if (isInitial) setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    loadImages(currentPage + 1);
  }, [currentPage, loadingMore, hasMore, loadImages]);

  const refresh = useCallback(() => {
    setCurrentPage(1);
    setHasMore(true);
    loadImages(1, true);
  }, [loadImages]);

  useEffect(() => {
    checkConnection();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [checkConnection]);

  return {
    images,
    loading,
    loadingMore,
    serverStatus,
    checkConnection,
    refresh,
    loadMore,
    hasMore,
  };
};