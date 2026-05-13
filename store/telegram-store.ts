import { create } from "zustand";

type TelegramState = {
  isMiniApp: boolean;
  initData: string | null;
  setMiniApp: (isMiniApp: boolean) => void;
  setInitData: (initData: string | null) => void;
};

export const useTelegramStore = create<TelegramState>((set) => ({
  isMiniApp: false,
  initData: null,
  setMiniApp: (isMiniApp) => set({ isMiniApp }),
  setInitData: (initData) => set({ initData }),
}));

