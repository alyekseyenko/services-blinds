import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBackToClose } from "@/hooks/useBackToClose";

describe("useBackToClose", () => {
  const backSpy = vi.fn();

  beforeEach(() => {
    backSpy.mockClear();
    vi.spyOn(window.history, "back").mockImplementation(backSpy);
    vi.spyOn(window.history, "pushState").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dismissWithoutHistoryBack não chama history.back ao fechar o overlay", () => {
    const onClose = vi.fn();
    const { result, rerender } = renderHook(
      ({ open }) => useBackToClose(open, onClose, "test-overlay"),
      { initialProps: { open: true } }
    );

    act(() => {
      result.current.dismissWithoutHistoryBack();
    });
    rerender({ open: false });

    expect(onClose).not.toHaveBeenCalled();
    expect(backSpy).not.toHaveBeenCalled();
  });
});