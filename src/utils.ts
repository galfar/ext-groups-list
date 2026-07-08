/// <reference path="../types/chrome.d.ts" />

export function getElementByIdStrict<T extends HTMLElement>(id: string): T {
    const elem = document.getElementById(id);
    if (!elem) {
        throw new Error(`Element with id "${id}" not found`);
    }
    return elem as T;
}

export function pluralize(count: number, noun: string): string {
    const pluralSuffix = "s";
    return `${count} ${noun}${count !== 1 ? pluralSuffix : ""}`;
}

interface SessionStorageSchema {
    filterText?: string; 
}

export async function getStoredFilterText(): Promise<string> {
    const result = await chrome.storage.session.get("filterText") as SessionStorageSchema;
    return result.filterText ?? "";
}

export async function setStoredFilterText(value: string): Promise<void> {
    const data: SessionStorageSchema = { filterText: value };
    await chrome.storage.session.set(data);
}

export type SortMode = "default" | "alphabetical";

interface LocalStorageSchema {
    sortMode?: SortMode;
}

export async function getSortPreference(): Promise<SortMode> {
    const result = await chrome.storage.local.get("sortMode") as LocalStorageSchema;
    return result.sortMode ?? "default";
}

export async function setSortPreference(mode: SortMode): Promise<void> {
    const data: LocalStorageSchema = { sortMode: mode };
    await chrome.storage.local.set(data);
}

