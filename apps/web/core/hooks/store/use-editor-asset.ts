// store
import { useEditorAssetStore, selectAssetsUploadPercentage } from "@/store/client/editor-asset.store";

export const useEditorAsset = () => {
  const store = useEditorAssetStore();
  const assetsUploadPercentage = useEditorAssetStore(selectAssetsUploadPercentage);

  return {
    ...store,
    assetsUploadPercentage,
  };
};
