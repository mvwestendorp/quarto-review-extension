## Phase 3 · Task P3-T5 Error States — Discovery Notes (2024-02-14)

### Current Behaviour
- `TranslationController.translateDocument()` and `translateSentence()` catch errors, surface a toast (`showNotification('Translation failed', 'error')`), and emit `translation:state-updated` with status `phase: 'error'`.
- The new inline progress UI renders the error message, but the view does not highlight the specific sentences that failed or offer a retry affordance.
- Per-sentence spinners stop via `markSentencesLoading(..., false)` in `finally`, so the UI returns to idle without explicit error styling.
- Sidebar buttons remain active; retry requires re-clicking the original action. No persistent banner or inline CTA exists.
- Provider-level failures (initialisation, caching) fall back to toast notifications only.

### Pain Points / Gaps
1. **Lack of contextual feedback**: users only see a toast + progress message; individual sentences do not indicate failure.
2. **No retry shortcut**: after an error the user must re-trigger the action via sidebar; no inline "Retry" control.
3. **Missing error memory**: once progress resets to `idle`, there is no indication that the last operation failed.
4. **Accessibility**: aria-live feedback exists from toast/progress, but there is no role='alert' inline to explain which sentence failed.

### Proposed Enhancements
- Introduce a transient error state banner in the translation header with detailed message + retry buttons for document/sentence.
- Mark sentences whose translation failed with an error badge (e.g., `data-status='error'`, red border, tooltip).
- Track last error payload in `TranslationController` so the view can re-render error indicators until a successful update clears them.
- Provide a retry callback via the banner/sentence badge to invoke `translateDocument()` / `translateSentence(id)`.
- Ensure toasts remain for global visibility but rely on inline UI for persistent clues.

### Next Steps
1. Define data contract for `translation:sentence-error` event (if needed) or extend existing status payload.
2. Update CSS token mapping for error chips/banners.
3. Extend tests to assert that error states render and retry clears the indicators.
