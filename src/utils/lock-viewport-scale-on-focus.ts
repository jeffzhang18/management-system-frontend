const COARSE_POINTER_QUERY = "(hover: none) and (pointer: coarse)";
const EDITABLE_SELECTOR = "input, textarea, select, [contenteditable]:not([contenteditable='false'])";
const RESTORE_DELAY_MS = 300;

/**
 * iOS Safari zooms the page when an input gains focus and never zooms back out.
 * Pinning `maximum-scale=1` while an editable control is focused prevents that
 * zoom, and the original viewport is restored on blur so pinch zoom still works.
 */
export function lockViewportScaleOnFocus() {
	if (typeof window === "undefined" || !window.matchMedia(COARSE_POINTER_QUERY).matches) return;

	const viewportMeta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
	if (!viewportMeta) return;

	const originalContent = viewportMeta.content;
	const lockedContent = `${originalContent}, maximum-scale=1`;
	let restoreTimer: number | undefined;

	const isEditable = (target: EventTarget | null) => target instanceof Element && target.matches(EDITABLE_SELECTOR);

	document.addEventListener("focusin", (event) => {
		if (!isEditable(event.target)) return;
		window.clearTimeout(restoreTimer);
		viewportMeta.content = lockedContent;
	});

	document.addEventListener("focusout", (event) => {
		if (!isEditable(event.target)) return;
		window.clearTimeout(restoreTimer);
		restoreTimer = window.setTimeout(() => {
			viewportMeta.content = originalContent;
		}, RESTORE_DELAY_MS);
	});
}
