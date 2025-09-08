import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Hook to detect unsaved changes and handle navigation blocking
 */
export function useUnsavedChanges<T extends Record<string, any>>(
  originalData: T | null,
  currentData: T,
  options: {
    enabled?: boolean;
    onSave?: () => Promise<void> | void;
    onDiscard?: () => void;
  } = {}
) {
  const { enabled = true, onSave, onDiscard } = options;
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null
  );
  const originalDataRef = useRef(originalData);
  const navigate = useNavigate();

  // Update original data reference when it changes
  useEffect(() => {
    originalDataRef.current = originalData;
    setHasUnsavedChanges(false);
  }, [originalData]);

  // Detect changes by comparing current data with original
  useEffect(() => {
    if (!enabled || !originalDataRef.current) {
      setHasUnsavedChanges(false);
      return;
    }

    const hasChanges = Object.keys(currentData).some((key) => {
      const currentValue = currentData[key];
      const originalValue = originalDataRef.current![key];

      // Handle undefined/null comparisons
      if (currentValue === undefined || currentValue === null) {
        return (
          originalValue !== undefined &&
          originalValue !== null &&
          originalValue !== ""
        );
      }

      return currentValue !== originalValue;
    });

    setHasUnsavedChanges(hasChanges);
  }, [currentData, enabled]);

  // Handle browser beforeunload event
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, enabled]);

  const handleSaveAndContinue = async () => {
    try {
      await onSave?.();
      setHasUnsavedChanges(false);
      setShowConfirmDialog(false);

      // Navigate to pending location if set
      if (pendingNavigation) {
        navigate(pendingNavigation);
        setPendingNavigation(null);
      }
    } catch (error) {
      // Let the parent component handle save errors
      console.error("Save failed:", error);
    }
  };

  const handleDiscardAndContinue = () => {
    onDiscard?.();
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);

    // Navigate to pending location if set
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setPendingNavigation(null);
  };

  const markAsSaved = () => {
    setHasUnsavedChanges(false);
  };

  // Function to check for unsaved changes before navigation
  const checkUnsavedChanges = (navigationPath?: string) => {
    if (enabled && hasUnsavedChanges) {
      if (navigationPath) {
        setPendingNavigation(navigationPath);
      }
      setShowConfirmDialog(true);
      return true; // Has unsaved changes
    }
    return false; // No unsaved changes, allow navigation
  };

  return {
    hasUnsavedChanges,
    showConfirmDialog,
    handleSaveAndContinue,
    handleDiscardAndContinue,
    handleCancel,
    markAsSaved,
    checkUnsavedChanges,
  };
}
