import { create } from "zustand";

export type AuthUser = {
  userId: string;
  teamId: string;
  roleKey?: "FOUNDER" | "ADMIN" | "STAFF" | null;
};

type AuthState = {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
