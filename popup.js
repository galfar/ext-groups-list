chrome.tabGroups.query({ }, groups => {
    const tabGroupsList = document.getElementById('tabGroupsList');
    
    groups.forEach(group => {
        const listItem = createGroupListItem(group);
        tabGroupsList.appendChild(listItem);
    });
});

function createGroupListItem(group) {
    let listItem = document.createElement('li');
    listItem.textContent = group.title || '(Unnamed Group)';        
    // NOTE: group color is just an enum. It maps to CSS colors
    // but browsers can have different mapping to final colors
    // (and they do, see the ugly color palette in Edge).
    // No way to get the final color from extension API (yet).
    listItem.style.setProperty("--group-color", group.color);

    const tabCount = 7; // TODO

    let detailsSpan = document.createElement('span');
    detailsSpan.textContent = `(${tabCount} tabs)`;
    listItem.appendChild(detailsSpan);

    listItem.addEventListener('click', () => {
        activateFirstTabInGroup(group);
    });

    return listItem;
}

function activateFirstTabInGroup(group) {
    const groupId = group.id;
    const windowId = group.windowId;

    chrome.tabs.query({ groupId }, tabs => {
        if (tabs.length > 0) {
            const tabId = tabs[0].id;
            chrome.windows.update(windowId, { focused: true }, () => {
                chrome.tabs.update(tabId, { active: true })
            });
        }
    });
}