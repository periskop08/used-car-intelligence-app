"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { 
  CANONICAL_TURKEY_CITIES, 
  CanonicalCity, 
  findCanonicalCityById, 
  findCanonicalCityByName 
} from "@used-car-intelligence/shared";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://used-car-api-hzmu.onrender.com";

const ANONYMOUS_CITY_KEY = "torquescout_anonymous_city";

interface GlobalCityContextType {
  activeCityId: string | null;
  activeCity: CanonicalCity | null;
  activeCityName: string;
  setActiveCity: (cityId: string | null) => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
  clearError: () => void;
}

const GlobalCityContext = createContext<GlobalCityContextType>({
  activeCityId: null,
  activeCity: null,
  activeCityName: "Tüm Türkiye",
  setActiveCity: async () => {},
  isLoading: false,
  errorMessage: null,
  clearError: () => {},
});

export function GlobalCityProvider({ children }: { children: React.ReactNode }) {
  const [activeCityId, setActiveCityId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Helper to get user-scoped key
  const getUserCityKey = (userId: string) => `torquescout_active_city_${userId}`;

  // Initialize from storage or server
  useEffect(() => {
    let isMounted = true;

    const initializeCity = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const savedUserStr = localStorage.getItem("user");
        let parsedUser: any = null;

        if (savedUserStr) {
          try {
            parsedUser = JSON.parse(savedUserStr);
            if (parsedUser?.id) {
              setCurrentUserId(parsedUser.id);
            }
          } catch {
            // ignore
          }
        }

        if (token) {
          // 1. Authenticated user: Check cached user-scoped preference first for fast hydration
          if (parsedUser?.id) {
            const cachedUserCity = localStorage.getItem(getUserCityKey(parsedUser.id));
            if (cachedUserCity && isMounted) {
              const matched = findCanonicalCityById(cachedUserCity) || findCanonicalCityByName(cachedUserCity);
              if (matched) {
                setActiveCityId(matched.id);
              }
            }
          }

          // 2. Fetch fresh canonical profile from server (DB is single source of truth)
          try {
            const res = await fetch(`${API_URL}/users/me`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
              const freshUser = await res.json();
              if (isMounted && freshUser) {
                if (freshUser.id) setCurrentUserId(freshUser.id);
                
                // Server DB preference is canonical
                if (freshUser.activeCityId) {
                  const canonical = findCanonicalCityById(freshUser.activeCityId);
                  if (canonical) {
                    setActiveCityId(canonical.id);
                    localStorage.setItem(getUserCityKey(freshUser.id), canonical.id);
                  }
                } else {
                  // User has no server city preference
                  setActiveCityId(null);
                  if (freshUser.id) {
                    localStorage.removeItem(getUserCityKey(freshUser.id));
                  }
                }
              }
            }
          } catch {
            // fallback to cache
          }
        } else {
          // Anonymous visitor: Read from anonymous localStorage key
          setCurrentUserId(null);
          const anonCity = localStorage.getItem(ANONYMOUS_CITY_KEY);
          if (anonCity && isMounted) {
            const matched = findCanonicalCityById(anonCity) || findCanonicalCityByName(anonCity);
            if (matched) {
              setActiveCityId(matched.id);
            }
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeCity();

    // Listen to external auth updates
    const handleAuthChange = () => {
      initializeCity();
    };

    window.addEventListener("auth_state_changed", handleAuthChange);
    return () => {
      isMounted = false;
      window.removeEventListener("auth_state_changed", handleAuthChange);
    };
  }, []);

  const setActiveCity = useCallback(
    async (rawCityId: string | null) => {
      const prevCityId = activeCityId;
      let targetId: string | null = null;

      if (rawCityId) {
        const canonical = findCanonicalCityById(rawCityId) || findCanonicalCityByName(rawCityId);
        if (canonical) {
          targetId = canonical.id;
        }
      }

      // Optimistic state update
      setActiveCityId(targetId);
      setErrorMessage(null);

      // Persist in localStorage immediately
      const token = localStorage.getItem("accessToken");
      if (currentUserId && token) {
        const userKey = getUserCityKey(currentUserId);
        if (targetId) {
          localStorage.setItem(userKey, targetId);
        } else {
          localStorage.removeItem(userKey);
        }
      } else {
        if (targetId) {
          localStorage.setItem(ANONYMOUS_CITY_KEY, targetId);
        } else {
          localStorage.removeItem(ANONYMOUS_CITY_KEY);
        }
      }

      // Dispatch global event for non-react listeners
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("global_city_changed", {
            detail: { cityId: targetId },
          })
        );
      }

      // If authenticated, persist to server DB
      if (token) {
        try {
          const res = await fetch(`${API_URL}/users/me/active-city`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ activeCityId: targetId }),
          });

          if (!res.ok) {
            throw new Error(`Server returned ${res.status}`);
          }

          // Update saved user object if present
          const savedUserStr = localStorage.getItem("user");
          if (savedUserStr) {
            try {
              const u = JSON.parse(savedUserStr);
              u.activeCityId = targetId;
              localStorage.setItem("user", JSON.stringify(u));
            } catch {
              // ignore
            }
          }
        } catch (err: any) {
          console.error("Failed to sync active city to server:", err);
          // Rollback on server error
          setActiveCityId(prevCityId);
          if (currentUserId) {
            const userKey = getUserCityKey(currentUserId);
            if (prevCityId) {
              localStorage.setItem(userKey, prevCityId);
            } else {
              localStorage.removeItem(userKey);
            }
          }
          setErrorMessage("Şehir seçimi sunucuyla senkronize edilemedi. Önceki seçim geri yüklendi.");
          // Re-dispatch rollback
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("global_city_changed", {
                detail: { cityId: prevCityId },
              })
            );
          }
        }
      }
    },
    [activeCityId, currentUserId]
  );

  const activeCity = useMemo(() => {
    return activeCityId ? findCanonicalCityById(activeCityId) || null : null;
  }, [activeCityId]);

  const activeCityName = useMemo(() => {
    return activeCity ? activeCity.name : "Tüm Türkiye";
  }, [activeCity]);

  return (
    <GlobalCityContext.Provider
      value={{
        activeCityId,
        activeCity,
        activeCityName,
        setActiveCity,
        isLoading,
        errorMessage,
        clearError: () => setErrorMessage(null),
      }}
    >
      {children}
    </GlobalCityContext.Provider>
  );
}

export function useGlobalCity() {
  const context = useContext(GlobalCityContext);
  if (!context) {
    throw new Error("useGlobalCity must be used within a GlobalCityProvider");
  }
  return context;
}
