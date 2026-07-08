/// <reference path="../types/chrome.d.ts" />
export function getElementByIdStrict(id) {
    const elem = document.getElementById(id);
    if (!elem) {
        throw new Error(`Element with id "${id}" not found`);
    }
    return elem;
}
export function pluralize(count, noun) {
    const pluralSuffix = "s";
    return `${count} ${noun}${count !== 1 ? pluralSuffix : ""}`;
}
export async function getStoredFilterText() {
    const result = await chrome.storage.session.get("filterText");
    return result.filterText ?? "";
}
export async function setStoredFilterText(value) {
    const data = { filterText: value };
    await chrome.storage.session.set(data);
}
export async function getSortPreference() {
    const result = await chrome.storage.local.get("sortMode");
    return result.sortMode ?? "default";
}
export async function setSortPreference(mode) {
    const data = { sortMode: mode };
    await chrome.storage.local.set(data);
}
