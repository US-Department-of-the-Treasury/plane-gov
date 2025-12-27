"use client";

import { useState, useEffect } from "react";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { X, Globe, Lock } from "lucide-react";
// plane imports
import { Button } from "@plane/propel/button";
import { EmojiPicker, EmojiIconPickerTypes, Logo } from "@plane/propel/emoji-icon-picker";
import type { TLogoProps, TWikiPageFormData } from "@plane/types";
import { EWikiPageAccess } from "@plane/types";
import { EModalPosition, EModalWidth, ModalCore, Input, CustomSelect } from "@plane/ui";
// components
import { ImagePickerPopover } from "@/components/core/image-picker-popover";
import { MemberCombobox } from "@/components/dropdowns/member/member-combobox";
// helpers
import { DEFAULT_COVER_IMAGE_URL, getCoverImageDisplayURL, getRandomCoverImage } from "@/helpers/cover-image.helper";
// hooks
import { useAppRouter } from "@/hooks/use-app-router";
// queries
import { useCreateWikiPage, useWikiCollections } from "@/store/queries";

interface CreateWikiPageModalProps {
  workspaceSlug: string;
  isOpen: boolean;
  onClose: () => void;
  parentPageId?: string;
  collectionId?: string;
}

type FormData = {
  name: string;
  collection: string | null;
  logo_props: TLogoProps;
  access: EWikiPageAccess;
  maintainer: string | null;
  cover_image_url: string | null;
};

// Access options for wiki pages
const WIKI_ACCESS_OPTIONS = [
  {
    key: EWikiPageAccess.SHARED,
    label: "Shared",
    description: "Visible to all workspace members",
    icon: Globe,
  },
  {
    key: EWikiPageAccess.PRIVATE,
    label: "Private",
    description: "Only you can access",
    icon: Lock,
  },
];

// Default logo props with a random icon
const getDefaultLogoProps = (): TLogoProps => ({
  in_use: "icon",
  icon: {
    name: "FileText",
    color: "#6366f1",
  },
});

export function CreateWikiPageModal({
  workspaceSlug,
  isOpen,
  onClose,
  parentPageId,
  collectionId,
}: CreateWikiPageModalProps) {
  const router = useAppRouter();
  const createPageMutation = useCreateWikiPage();
  const { data: collections } = useWikiCollections(workspaceSlug);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  const methods = useForm<FormData>({
    defaultValues: {
      name: "",
      collection: collectionId || null,
      logo_props: getDefaultLogoProps(),
      access: EWikiPageAccess.SHARED,
      maintainer: null,
      cover_image_url: null,
    },
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = methods;

  // Set random cover image when modal opens
  useEffect(() => {
    if (isOpen) {
      setValue("cover_image_url", getRandomCoverImage());
    }
  }, [isOpen, setValue]);

  // eslint-disable-next-line react-hooks/incompatible-library -- watch() pattern used throughout codebase
  const coverImage = watch("cover_image_url");

  const handleClose = () => {
    reset({
      name: "",
      collection: collectionId || null,
      logo_props: getDefaultLogoProps(),
      access: EWikiPageAccess.SHARED,
      maintainer: null,
      cover_image_url: null,
    });
    onClose();
  };

  const onSubmit = (data: FormData) => {
    // Validate emoji is set
    if (!data.logo_props?.in_use) {
      return;
    }

    const payload: TWikiPageFormData = {
      name: data.name,
      parent: parentPageId || null,
      collection: data.collection || null,
      logo_props: data.logo_props,
      access: data.access,
      // Store cover image and maintainer in view_props for future use
      view_props: {
        cover_image_url: data.cover_image_url,
        maintainer: data.maintainer,
      },
    };

    createPageMutation.mutate(
      {
        workspaceSlug,
        data: payload,
      },
      {
        onSuccess: (page) => {
          handleClose();
          router.push(`/${workspaceSlug}/wiki/${page.id}`);
        },
      }
    );
  };

  return (
    <ModalCore isOpen={isOpen} handleClose={handleClose} position={EModalPosition.TOP} width={EModalWidth.XXL}>
      <FormProvider {...methods}>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          {/* Header with cover image */}
          <div className="group relative h-44 w-full rounded-t-lg">
            {coverImage && (
              <img
                src={getCoverImageDisplayURL(coverImage, DEFAULT_COVER_IMAGE_URL)}
                className="absolute left-0 top-0 h-full w-full rounded-t-lg object-cover"
                alt="Page cover"
              />
            )}

            {/* Close button */}
            <div className="absolute right-2 top-2 p-2">
              <button type="button" onClick={handleClose}>
                <X className="h-5 w-5 text-on-color" />
              </button>
            </div>

            {/* Change cover button */}
            <div className="absolute bottom-2 right-2">
              <Controller
                name="cover_image_url"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <ImagePickerPopover label="Change cover" onChange={onChange} value={value ?? null} />
                )}
              />
            </div>

            {/* Emoji picker overlapping the cover */}
            <div className="absolute -bottom-[22px] left-3">
              <Controller
                name="logo_props"
                control={control}
                rules={{
                  validate: (value) => {
                    if (!value?.in_use) return "Please select an icon for your page";
                    return true;
                  },
                }}
                render={({ field: { value, onChange } }) => (
                  <EmojiPicker
                    iconType="lucide"
                    isOpen={isEmojiPickerOpen}
                    handleToggle={(val: boolean) => setIsEmojiPickerOpen(val)}
                    className="flex items-center justify-center"
                    buttonClassName="flex items-center justify-center"
                    label={
                      <span className="grid h-11 w-11 place-items-center rounded-md bg-layer-1">
                        <Logo logo={value} size={20} type="lucide" />
                      </span>
                    }
                    onChange={(val: { type: string; value: unknown; shouldClose?: boolean }) => {
                      let logoValue: Record<string, unknown> = {};

                      if (val?.type === "emoji")
                        logoValue = {
                          value: val.value,
                        };
                      else if (val?.type === "icon") logoValue = val.value as Record<string, unknown>;

                      onChange({
                        in_use: val?.type as "emoji" | "icon",
                        [val?.type]: logoValue,
                      });
                      // Only close if shouldClose is true (default)
                      if (val?.shouldClose !== false) {
                        setIsEmojiPickerOpen(false);
                      }
                    }}
                    defaultIconColor={value?.in_use === "icon" ? value.icon?.color : undefined}
                    defaultOpen={value?.in_use === "emoji" ? EmojiIconPickerTypes.EMOJI : EmojiIconPickerTypes.ICON}
                  />
                )}
              />
            </div>
          </div>

          {/* Form content */}
          <div className="p-5 pt-8">
            <div className="space-y-4">
              {/* Page title */}
              <div>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: "Page title is required" }}
                  render={({ field }) => (
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    <Input {...field} placeholder="Page name" className="w-full" hasError={!!errors.name} autoFocus />
                  )}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                {errors.logo_props && <p className="text-xs text-red-500 mt-1">{errors.logo_props.message}</p>}
              </div>

              {/* Attributes row - Access and Maintainer */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Access selector */}
                <Controller
                  name="access"
                  control={control}
                  render={({ field: { onChange, value } }) => {
                    const currentAccess = WIKI_ACCESS_OPTIONS.find((opt) => opt.key === value);
                    const Icon = currentAccess?.icon || Globe;

                    return (
                      <div className="flex-shrink-0 h-7">
                        <CustomSelect
                          value={value}
                          onChange={onChange}
                          label={
                            <div className="flex items-center gap-1.5 h-full text-13">
                              <Icon className="h-3.5 w-3.5" />
                              <span>{currentAccess?.label || "Shared"}</span>
                            </div>
                          }
                          placement="bottom-start"
                          className="h-full"
                          buttonClassName="h-full"
                          noChevron
                        >
                          {WIKI_ACCESS_OPTIONS.map((option) => {
                            const OptionIcon = option.icon;
                            return (
                              <CustomSelect.Option key={option.key} value={option.key}>
                                <div className="flex items-start gap-2">
                                  <OptionIcon className="h-3.5 w-3.5 mt-0.5" />
                                  <div className="-mt-0.5">
                                    <p>{option.label}</p>
                                    <p className="text-11 text-placeholder">{option.description}</p>
                                  </div>
                                </div>
                              </CustomSelect.Option>
                            );
                          })}
                        </CustomSelect>
                      </div>
                    );
                  }}
                />

                {/* Maintainer selector */}
                <Controller
                  name="maintainer"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <div className="flex-shrink-0 h-7">
                      <MemberCombobox
                        value={value}
                        onChange={(member) => onChange(member === value ? null : member)}
                        placeholder="Maintainer"
                        multiple={false}
                        buttonVariant="border-with-text"
                        showUserDetails
                      />
                    </div>
                  )}
                />

                {/* Collection selector (if collections exist) */}
                {collections && collections.length > 0 && (
                  <Controller
                    name="collection"
                    control={control}
                    render={({ field: { onChange, value } }) => {
                      const currentCollection = collections.find((c) => c.id === value);

                      return (
                        <div className="flex-shrink-0 h-7">
                          <CustomSelect
                            value={value}
                            onChange={onChange}
                            label={
                              <div className="flex items-center gap-1.5 h-full text-13">
                                <span>📁</span>
                                <span>{currentCollection?.name || "No collection"}</span>
                              </div>
                            }
                            placement="bottom-start"
                            className="h-full"
                            buttonClassName="h-full"
                            noChevron
                          >
                            <CustomSelect.Option value={null}>
                              <div className="flex items-center gap-2">
                                <span>📄</span>
                                <span>No collection</span>
                              </div>
                            </CustomSelect.Option>
                            {collections.map((collection) => (
                              <CustomSelect.Option key={collection.id} value={collection.id}>
                                <div className="flex items-center gap-2">
                                  <span>📁</span>
                                  <span>{collection.name}</span>
                                </div>
                              </CustomSelect.Option>
                            ))}
                          </CustomSelect>
                        </div>
                      );
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-5 pt-0">
            <Button variant="secondary" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={isSubmitting || createPageMutation.isPending}>
              Create page
            </Button>
          </div>
        </form>
      </FormProvider>
    </ModalCore>
  );
}
