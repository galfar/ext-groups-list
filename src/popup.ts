/// <reference path="../types/chrome.d.ts" />

// Maps a tab group's id to the list of tabs currently inside that group.
// Populated once per popup open in buildGroupsListing().
let tabsOfGroups: Record<number, chrome.tabs.Tab[]> = {};

function getElementByIdStrict<T extends HTMLElement>(id: string): T {
    const elem = document.getElementById(id);
    if (!elem) {
        throw new Error(`Element with id "${id}" not found`);
    }
    return elem as T;
}

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

    const tabGroups = await chrome.tabGroups.query({});

    // Get tabs in the group - for showing the count and to be able to
    // activate some tab when the group list item is clicked.
    // Fetch tabs for all groups in parallel (Promise.all preserves order).
    const tabsPerGroup = await Promise.all(
        tabGroups.map(group => chrome.tabs.query({ groupId: group.id }))
    );
    tabGroups.forEach((group, index) => {
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
    for (const group of tabGroups) {
        const listItem = createGroupListItem(group);
        tabGroupsListElem.appendChild(listItem);
    }

    adjustDisplayModeIfNeeded();
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
        activateFirstTabInGroup(group);
    });

    return listItem;
}

function activateFirstTabInGroup(group: chrome.tabGroups.TabGroup): void {
    const tabs = tabsOfGroups[group.id];

    if (tabs.length > 0) {
        const windowId = group.windowId;
        const tabId = tabs[0].id;

        if (tabId === undefined) {
            return;
        }

        chrome.windows.update(windowId, { focused: true }, () => {
            chrome.tabs.update(tabId, { active: true });
            window.close();
        });
    }
}

function adjustDisplayModeIfNeeded(): void {
    // Max extension popup height is now 600px
    const maxAllowedHeight = 590;

    // Popup starts with 1 column. If the height exceeds the max allowed height, switch to 2 columns
    // and eventually to 3 columns.

    if (document.body.clientHeight > maxAllowedHeight) {
        document.documentElement.style.setProperty("--list-columns", "var(--list-columns-2col)");
        document.documentElement.style.setProperty("--popup-width", "var(--popup-width-2col)");

        // Force reflow before re-measuring height
        void document.body.offsetHeight;

        if (document.body.clientHeight > maxAllowedHeight) {
            document.documentElement.style.setProperty("--list-columns", "var(--list-columns-3col)");
            document.documentElement.style.setProperty("--popup-width", "var(--popup-width-3col)");
        }
    }
}

function pluralize(count: number, noun: string): string {
    const pluralSuffix = "s";
    return `${count} ${noun}${count !== 1 ? pluralSuffix : ""}`;
}
