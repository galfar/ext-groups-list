# Tab Groups List - Browser Extension

A simple extension (Chrome API) that shows a list of
*all tab groups across all browser windows* in a popup. Clicking the group
activates the first tab in that group and focuses its browser window if needed.

The purpose of the extension is to allow users to quickly find
specific tab group and navigate to it - useful especially for tab hoarders with many groups across many windows.

The extension tries to maximize the number of groups visible
without scrolling (as extension popup window size is limited by the browser) by displaying them in 1 to 3 columns based on the number of groups to show.

Browsers currently list all the groups (without their tabs) only in
the "Add tab to group" context menu - not very useful when you just want to jump to the group without adding anything.
And the search function often (depends on browser) only checks tabs and not group titles.

There is no group management or messing with individual tabs in this extension, you can find nice ones for that already or have built-in support.

In a nutshell:
- Shows a list of all tab groups across all browser windows.
- On a click navigates to the selected group.
- Only groups are involved, no tabs get in the way. No group management either.
- Extension is for Chromium based browsers that support tab groups.

## Browser Support

As of late 2023:
- Chrome, Brave: works fine
- Edge: works fine, only Edge uses different shades of tab group colors in recent versions
- Opera: uses tab groups as a basis for its "tab islands" feature, not reasonably manageable by users
- Opera GX: no tab groups support
- Vivaldi: tab groups support is not disabled but there's no UI to create and manage them

## Future Plans (Maybe)

- ~~Two column display option: As extension popup's height is limited by the browser, longer lists now show a vertical scrollbar and thus the user cannot see all the groups at a glance. Maximum popup width is quite big so two (maybe even three) would fit nicely.~~
  Implemented now with auto switching, nice would be also explicit user options: auto, single, two, three columns.
- When switching to group A: if the currently active tab in window is part of group A,
  do not activate the first tab of group A - keep the current one active.
- Sorting: at least switch between default and alphabetical.
- Search or highlight or filter list by group title.
- Default + Compact + EasyToClick view: user option to fit even more stuff in popup or in opposite direction make text and items bigger for easier clicking or touches.
- User Settings: set in the popup or in the extension's context menu and remember user's choices between sessions.
- Group pinning: pin some groups so they stay on top of the list on fixed positions. Useful when "working" with only several groups during session to save time looking for them in the list or using search (also with planned *add* button when doing tabs *cleanup*).
- With a lot of groups assigning tabs to groups from browser's native context menu is painful - takes ages to find the group and the position in the list also changes (tries to be helpful by moving recently used to top). Solution: Allow assigning tabs in our extension (on hover show some *add* button) - helpful together with search/filter and group pinning.
- Dark mode
