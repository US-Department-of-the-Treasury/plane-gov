import { useShallow } from "zustand/react/shallow";
// store
import { useEditorAssetStore, selectAssetsUploadPercentage } from "@/store/client/editor-asset.store";

export const useEditorAsset = () => {
  const store = useEditorAssetStore();
  // Use useShallow to prevent infinite re-renders when the selector returns a new object
  // with the same values. Without shallow comparison, useSyncExternalStore detects
  // different object references as "changes" causing an infinite loop.
  const assetsUploadPercentage = useEditorAssetStore(useShallow(selectAssetsUploadPercentage));

  return {
    ...store,
    assetsUploadPercentage,
  };
};
