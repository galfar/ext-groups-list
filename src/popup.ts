/// <reference path="../types/chrome.d.ts" />

import { getElementByIdStrict, pluralize, getStoredFilterText, setStoredFilterText, SortMode, getSortPreference, setSortPreference } from "./utils.js";

// Maps a tab group's id to the list of tabs currently inside that group.
// Populated once per popup open in buildGroupsListing().
let tabsOfGroups: Record<number, chrome.tabs.Tab[]> = {};

getElementByIdStrict<HTMLSpanElement>("info-btn").onclick = () => {
    getElementByIdStrict<HTMLDialogElement>("dialog").showModal();
};

buildGroupsListing();

async function buildGroupsListing(): Promise<void> {
    const totalTabCount = (await chrome.tabs.query({})).length;
    const windowCount = (await chrome.windows.getAll({})).length;

    const statusElem = getElementByIdStrict<HTMLElement>("status");

    if (!chrome.tabGroups) {
        // Browser with no tabGroups extension support e.g. Opera GX.
        const statusText =
            `You have ${pluralize(totalTabCount, "tab")} open across ${pluralize(windowCount, "window")}.<br/>` +
            `<b>Tab groups are not supported in this browser's extension API.</b>`;
        statusElem.innerHTML = statusText;
        return;
    }

    const sortMode = await getSortPreference();
    updateSortButtonLabel(sortMode);

    const tabGroups = await chrome.tabGroups.query({ });
    const sortedGroups = sortGroups(tabGroups, sortMode);

    // Get tabs in the group - for showing the count and to be able to
    // activate some tab when the group list item is clicked.
    // Fetch tabs for all groups in parallel (Promise.all preserves order).

    const tabsPerGroup = await Promise.all(
        sortedGroups.map(group => chrome.tabs.query({ groupId: group.id }))
    );
    sortedGroups.forEach((group, index) => {
        tabsOfGroups[group.id] = tabsPerGroup[index];
    });
   
    const groupedTabCount = Object.values(tabsOfGroups).reduce(
        (count, tabs) => count + tabs.length,
        0
    );

    const statusText =
        `You have ${pluralize(totalTabCount, "tab")} open across ${pluralize(windowCount, "window")}, ` +
        `${pluralize(groupedTabCount, "tab")} are grouped in ${pluralize(tabGroups.length, "group")}.`;
    statusElem.textContent = statusText;

    const tabGroupsListElem = getElementByIdStrict<HTMLUListElement>("tabGroupsList");
    for (const group of sortedGroups) {
        const listItem = createGroupListItem(group);
        tabGroupsListElem.appendChild(listItem);
    }

    adjustDisplayModeIfNeeded();
    syncToolbarWidthToListItem();
    await restoreFilterState();
}

function createGroupListItem(group: chrome.tabGroups.TabGroup): HTMLLIElement {
    const titleSpan = document.createElement("span");
    titleSpan.classList.add("title");

    if (group.title) {
        titleSpan.textContent = group.title;
    } else {
        titleSpan.textContent = "(No name)";
        titleSpan.classList.add("no-name");
    }

    const detailsSpan = document.createElement("span");
    detailsSpan.classList.add("detail");
    const tabCount = tabsOfGroups[group.id].length;
    detailsSpan.textContent = `(${tabCount} tabs)`;

    const listItem = document.createElement("li");
    listItem.appendChild(titleSpan);
    listItem.appendChild(detailsSpan);

    // NOTE: group color is just an enum. It maps to CSS colors
    // but browsers can have different mapping to final colors
    // (and they do, see the ugly color palette in Edge).
    // No way to get the final color from extension API (yet).
    listItem.style.setProperty("--group-color", group.color);

    listItem.addEventListener("click", () => {
        activateTabInGroup(group);
    });

    return listItem;
}

function activateTabInGroup(group: chrome.tabGroups.TabGroup): void {
    const tabs = tabsOfGroups[group.id];

    if (tabs.length > 0) {
        const windowId = group.windowId;
        const activeTabInGroup = tabs.find(tab => tab.active);

        chrome.windows.update(windowId, { focused: true }, () => {
            if (!activeTabInGroup) {
                // No tab in this group is currently active in its window,
                // activate the first tab in the group.
                const tabId = tabs[0].id;
                chrome.tabs.update(tabId, { active: true });
            }
            // If a tab in the group is already active, just focusing
            // the window is enough — leave the active tab untouched
            window.close();
        });
    }
}

function adjustDisplayModeIfNeeded() {
    // Popup starts with 1 column. If the height exceeds the max allowed height, switch to 2 columns
    // and eventually to 3 columns.
    // Max extension popup height is now 600px.

    const scrollArea = getElementByIdStrict('scrollArea');    

    // scrollHeight > clientHeight means content needs more room than
    // the flex-allocated space currently provides — i.e. it's scrolling.
    const isOverflowing = () => scrollArea.scrollHeight > scrollArea.clientHeight;

    if (isOverflowing()) {
        document.documentElement.style.setProperty("--list-columns", "var(--list-columns-2col)");
        document.documentElement.style.setProperty("--popup-width", "var(--popup-width-2col)");

        // Force reflow before re-measuring height
        void scrollArea.offsetHeight; 

        if (isOverflowing()) {
            document.documentElement.style.setProperty("--list-columns", "var(--list-columns-3col)");
            document.documentElement.style.setProperty("--popup-width", "var(--popup-width-3col)");
        }
    }
}

function syncToolbarWidthToListItem(): void {
    const toolbar = getElementByIdStrict<HTMLDivElement>("toolbar");
    const firstListItem = document.querySelector<HTMLLIElement>("#tabGroupsList li");

    // Set the toolbar width to match the first list item width, 
    // so that the filter input and sort button align with the list items.
    if (firstListItem) {
        const width = firstListItem.getBoundingClientRect().width;
        toolbar.style.width = `${width}px`;
    } else {
        toolbar.style.removeProperty("width");
    }
}

// Filtering  ------------------- 

function applyFilter(query: string) {
    const normalizedQuery = query.trim().toLowerCase();

    document.querySelectorAll<HTMLLIElement>("#tabGroupsList li").forEach(listItem => {
        const titleElem = listItem.querySelector<HTMLSpanElement>(".title");
        const title = titleElem?.textContent?.toLowerCase() ?? "";
        const matches = !normalizedQuery || title.includes(normalizedQuery);

        listItem.classList.toggle("dimmed", !matches);
    });
}

const searchInput = getElementByIdStrict<HTMLInputElement>("search-input");

searchInput.addEventListener("input", () => {
    const query = searchInput.value;
    applyFilter(query);
    setStoredFilterText(query);
});

async function restoreFilterState(): Promise<void> {
    const filterText = await getStoredFilterText();
    if (filterText) {
        searchInput.value = filterText;
        applyFilter(filterText);
    }
}

// Sorting -------------------

const sortButton = getElementByIdStrict<HTMLButtonElement>("sort-btn");

sortButton.addEventListener("click", async () => {
    const currentMode = await getSortPreference();
    const nextMode: SortMode = currentMode === "default" ? "alphabetical" : "default";
    await setSortPreference(nextMode);

    getElementByIdStrict<HTMLUListElement>("tabGroupsList").innerHTML = "";
    await buildGroupsListing();
});

function updateSortButtonLabel(currentMode: SortMode) {
    const nextLabel = currentMode === "default" ? "A↓Z" : "↕";
    const nextTooltip = currentMode === "default"
        ? "Sort alphabetically"
        : "Sort in default order";

    sortButton.textContent = nextLabel;
    sortButton.title = nextTooltip;
}

function sortGroups(tabGroups: chrome.tabGroups.TabGroup[], mode: SortMode): chrome.tabGroups.TabGroup[] {
    if (mode === "alphabetical") {
        return [...tabGroups].sort((a, b) =>
            (a.title ?? "").localeCompare(b.title ?? "")
        );
    }
    return tabGroups;
}

