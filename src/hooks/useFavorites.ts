import { useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      const loadedFavorites = await storage.loadFavorites();
      setFavorites(loadedFavorites);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = useCallback(async (name: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(name)) {
        newFavorites.delete(name);
      } else {
        newFavorites.add(name);
      }
      storage.saveFavorites(newFavorites);
      return newFavorites;
    });
  }, []);

  const clearFavorites = useCallback(async () => {
    setFavorites(new Set());
    await storage.saveFavorites(new Set());
  }, []);

  const isFavorite = useCallback((name: string) => {
    return favorites.has(name);
  }, [favorites]);

  return {
    favorites,
    toggleFavorite,
    clearFavorites,
    isFavorite,
    isLoading,
  };
};