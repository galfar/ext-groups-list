let tabsOfGroups = { };
buildGroupsListing();

async function buildGroupsListing() {
    const totalTabCount = (await chrome.tabs.query({ })).length;
    const windowCount = (await chrome.windows.getAll({ })).length;

    if (!chrome.tabGroups) {
        // Browser with no tabGroups extension support e.g. Opera GX.         
        const statusText = `You have ${totalTabCount} tabs open across ${windowCount} window(s).<br/>` + 
        `Tab groups are not supported in this browser's extension API.`; 
        document.getElementById("status").innerHTML = statusText;
        return;
    }

    const tabGroups = await chrome.tabGroups.query({ });
    
    for (const group of tabGroups) {
        const groupId = group.id;
        // Get tabs in the group - for showing the count and to be able to 
        // activate some tab when the group list item is clicked
        const tabsInGroup = await chrome.tabs.query({ groupId });
        tabsOfGroups[groupId] = tabsInGroup;
    }

    const groupedTabCount = Object.values(tabsOfGroups).reduce((count, tabs) => count + tabs.length, 0);
    const statusText = `You have ${totalTabCount} tabs open across ${windowCount} window(s), ` + 
        `${groupedTabCount} tabs are grouped in ${tabGroups.length} groups.`;
    document.getElementById("status").textContent = statusText;

    const tabGroupsListElem = document.getElementById('tabGroupsList');
    for (const group of tabGroups) {    
        const listItem = createGroupListItem(group);
        tabGroupsListElem.appendChild(listItem);
    }

    adjustDisplayModeIfNeeded(tabGroupsListElem);
}

function createGroupListItem(group) {
    let listItem = document.createElement('li');

    if (group.title) {
        listItem.textContent = group.title;
    } else {
        listItem.textContent = '(No name)';        
        listItem.classList.add("no-name");
    }

    // NOTE: group color is just an enum. It maps to CSS colors
    // but browsers can have different mapping to final colors
    // (and they do, see the ugly color palette in Edge).
    // No way to get the final color from extension API (yet).
    listItem.style.setProperty("--group-color", group.color);

    let detailsSpan = document.createElement('span');
    const tabCount = tabsOfGroups[group.id].length;
    detailsSpan.textContent = `(${tabCount} tabs)`;
    listItem.appendChild(detailsSpan);

    listItem.addEventListener('click', () => {
        activateFirstTabInGroup(group);
    });

    return listItem;
}

function activateFirstTabInGroup(group) {        
    const tabs = tabsOfGroups[group.id];

    if (tabs.length > 0) {
        const windowId = group.windowId;
        const tabId = tabs[0].id;

        chrome.windows.update(windowId, { focused: true }, () => {
            chrome.tabs.update(tabId, { active: true });
            window.close();
        });
    }
}

function adjustDisplayModeIfNeeded() {
    // Max extension popup height is now 600px
    const maxAllowedHeight = 590;   

    // Browser will reflow DOM on changes but should not repaint immediately
    if (document.body.clientHeight > maxAllowedHeight) {
        document.documentElement.style.setProperty("--list-columns", "var(--list-columns-2col)");
        document.documentElement.style.setProperty("--popup-width", "var(--popup-width-2col)");
    }
    if (document.body.clientHeight > maxAllowedHeight) {
        document.documentElement.style.setProperty("--list-columns", "var(--list-columns-3col)");
        document.documentElement.style.setProperty("--popup-width", "var(--popup-width-3col)");
    }
}