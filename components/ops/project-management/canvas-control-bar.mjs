export function getCanvasControlBarState(isOpen) {
  return {
    isContentVisible: isOpen,
    toggleLabel: isOpen ? "Hide controls" : "Show controls",
  };
}
