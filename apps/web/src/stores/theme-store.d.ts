type ThemeMode = 'light' | 'dark';
interface ThemeStore {
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;
    toggleTheme: () => void;
    initTheme: () => void;
}
export declare const useThemeStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<ThemeStore>, "setState" | "persist"> & {
    setState(partial: ThemeStore | Partial<ThemeStore> | ((state: ThemeStore) => ThemeStore | Partial<ThemeStore>), replace?: false | undefined): unknown;
    setState(state: ThemeStore | ((state: ThemeStore) => ThemeStore), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<ThemeStore, ThemeStore, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: ThemeStore) => void) => () => void;
        onFinishHydration: (fn: (state: ThemeStore) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<ThemeStore, ThemeStore, unknown>>;
    };
}>;
export {};
//# sourceMappingURL=theme-store.d.ts.map