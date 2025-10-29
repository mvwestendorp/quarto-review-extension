# Frequently Asked Questions

Common questions about using the Quarto Review Extension.

## Getting Started

### Q: How do I start using the Review Extension?
**A:** Open your Quarto document and click on any text element to start editing. Changes are automatically tracked.

### Q: Is there a quick start guide?
**A:** Yes! Check [README](./README.md) for a quick start overview.

### Q: What keyboard shortcut opens search?
**A:** `Cmd+F` on Mac or `Ctrl+F` on Windows/Linux. See [Keyboard Shortcuts](./KEYBOARD_SHORTCUTS.md) for more.

### Q: Where can I find all the features?
**A:** See [Features Guide](./FEATURES.md) for detailed documentation of all features.

## Editing & Changes

### Q: How do I undo a change?
**A:** Use `Cmd+Z` (Mac) or `Ctrl+Z` (Windows/Linux). You can undo unlimited times.

### Q: Can I edit multiple elements at once?
**A:** Currently, you edit one element at a time by clicking on it and making changes. Future versions may support batch operations.

### Q: How many changes can I track?
**A:** Unlimited! The extension tracks all changes in your browser session.

### Q: What happens if I refresh the page?
**A:** Changes are saved locally and preserved. However, they won't sync across browser sessions unless you export/save them.

### Q: Can I save my changes to a file?
**A:** Yes! Use the Export feature in the Change Summary Dashboard to copy a markdown summary of your edits.

## Search & Find

### Q: How do I search for text?
**A:** Press `Cmd+F` (Mac) or `Ctrl+F` (Windows/Linux) and type your search term.

### Q: Can I search for regular expressions?
**A:** Yes! Toggle the `.*` button in the search panel to enable regex mode. See [Features Guide](./FEATURES.md) for regex examples.

### Q: What's the difference between "Whole Word" and normal search?
**A:** Whole Word only matches complete words. Without it, "test" matches "testing" and "tested" too.

### Q: Can I do find and replace?
**A:** Currently, search highlights and navigates to matches. To replace, edit directly in the document.

### Q: Is search case-sensitive?
**A:** By default, no. Toggle the `Aa` button to enable case-sensitive search.

## Comments & Annotations

### Q: How do I add comments?
**A:** Select text, open the comment menu or badge, and use the sidebar composer to submit your note.

### Q: Can I reply to comments?
**A:** Replies are supported through the comment composer in the sidebar.

### Q: How do I delete a comment?
**A:** Open the comment and choose the delete action in the composer.

### Q: Can I export comments?
**A:** Exporting comment threads is planned. For now, include change summaries via the dashboard export.

## Change Summary Dashboard

### Q: What does "Change Summary Dashboard" show?
**A:** It shows statistics about all your changes including counts, character changes, and distribution by element type.

### Q: How do I open the Change Summary Dashboard?
**A:** Click the "Change Summary" button in the toolbar.

### Q: Can I export the change summary?
**A:** Yes! Click "Export Summary" and the markdown is copied to your clipboard.

### Q: How often does the summary update?
**A:** It updates in real-time as you make changes.

### Q: Can I filter the changes list?
**A:** You can click on any change to navigate to it. Full filtering is a planned feature.

## Performance & Technical

### Q: Is the extension slow with large documents?
**A:** The extension handles large documents well. Search and change tracking use optimized algorithms. If you experience slowness, try refreshing the page.

### Q: Does the extension work offline?
**A:** Yes, all editing happens in the browser. Git operations still require a network connection.

### Q: What browsers are supported?
**A:** Modern browsers including Chrome, Firefox, Safari, and Edge. Mobile browsers are supported with touch-optimized UI.

### Q: Why is my search not finding text?
**A:**
1. Check spelling
2. Try disabling "Case Sensitive"
3. Try disabling "Whole Word"
4. Try simpler search terms

### Q: Why can't I edit this element?
**A:** Some elements like code blocks may have special handling. Try using the standard editor. If it still doesn't work, see [Troubleshooting](./TROUBLESHOOTING.md).

## Collaboration

### Q: Can multiple people edit the same document?
**A:** Collaborate by sharing the rendered HTML or using Git to exchange `.qmd` updates. Real-time collaboration is on the roadmap.

### Q: How do I share my changes with others?
**A:** Export the markdown summary from the dashboard and commit updated `.qmd` files to version control.

### Q: Can I see who made each change?
**A:** User attribution is limited in this release. Track authorship through your Git workflow.

### Q: How do I merge changes from multiple reviewers?
**A:** Use Git to merge `.qmd` files and resolve conflicts, then re-render with the review extension.

## Troubleshooting

### Q: My changes disappeared!
**A:**
1. Check if you're on the same page (refresh if needed)
2. Check Change Summary Dashboard to confirm changes exist
3. See [Troubleshooting](./TROUBLESHOOTING.md) for more help

### Q: Search is highlighting everything
**A:** You probably have an empty search term. Clear the search box or press Escape to close.

### Q: Keyboard shortcuts aren't working
**A:**
1. Check your keyboard layout
2. Try using the menu instead
3. See [Keyboard Shortcuts](./KEYBOARD_SHORTCUTS.md) for alternatives

### Q: The editor won't open
**A:** Try refreshing the page. If it persists, see [Troubleshooting](./TROUBLESHOOTING.md).

### Q: I need more help!
**A:** See [Troubleshooting](./TROUBLESHOOTING.md) for detailed solutions.

## Features & Roadmap

### Q: What features are planned?
**A:** Upcoming features include side-by-side comparison, multi-format export (PDF, Word), and AI-powered suggestions.

### Q: When will X feature be available?
**A:** Check our roadmap. Features are prioritized based on user feedback.

### Q: How do I request a feature?
**A:** Contact support with your feature request. We value user feedback!

### Q: Is there a mobile app?
**A:** The web version works on mobile with a touch-optimized interface. A native app is planned for future versions.

## Account & Settings

### Q: Do I need an account?
**A:** No. The extension runs entirely in the browser and stores session data locally.

### Q: How do I change my settings?
**A:** Configuration is handled through the Quarto document YAML and browser debug controls; there is no global settings panel yet.

### Q: Can I sync my changes across devices?
**A:** Not automatically. Export or commit your changes and share them via Git or other channels.

### Q: Is my data private?
**A:** All processing happens locally unless you choose to share the rendered HTML or push to a remote Git provider.

## Still Have Questions?

- Check [Features Guide](./FEATURES.md) for detailed feature explanations
- See [Keyboard Shortcuts](./KEYBOARD_SHORTCUTS.md) for command reference
- Review [Troubleshooting](./TROUBLESHOOTING.md) for common issues
- Contact support for additional help

We're here to help! 🎉
