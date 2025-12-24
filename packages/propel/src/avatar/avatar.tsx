import { Avatar as AvatarPrimitive } from "@base-ui-components/react/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../primitives/tooltip";
import { cn } from "../utils/classname";
import {  getSizeInfo, getBorderRadius, isAValidNumber } from "./helper";
import type {TAvatarSize} from "./helper";

type Props = {
  name?: string; //The name of the avatar which will be displayed on the tooltip
  fallbackBackgroundColor?: string; //The background color if the avatar image fails to load
  fallbackText?: string;
  fallbackTextColor?: string; //The text color if the avatar image fails to load
  showTooltip?: boolean; //Whether to show a tooltip with the name on hover
  size?: TAvatarSize; //The size of the avatars
  shape?: "circle" | "square";
  src?: string; //The source of the avatar image
  className?: string;
};

export function Avatar(props: Props) {
  const {
    name,
    fallbackBackgroundColor,
    fallbackText,
    fallbackTextColor,
    showTooltip = false,
    size = "md",
    shape = "circle",
    src,
    className = "",
  } = props;

  // get size details based on the size prop
  const sizeInfo = getSizeInfo(size);

  const fallbackLetter = name?.[0]?.toUpperCase() ?? fallbackText ?? "?";

  const avatarElement = (
    <div
      className={cn("grid place-items-center overflow-hidden", getBorderRadius(shape), {
        [sizeInfo.avatarSize]: !isAValidNumber(size),
      })}
      tabIndex={-1}
    >
      <AvatarPrimitive.Root className={cn("h-full w-full", getBorderRadius(shape), className)}>
        <AvatarPrimitive.Image src={src} width="48" height="48" />
        <AvatarPrimitive.Fallback
          className={cn(sizeInfo.fontSize, "grid h-full w-full place-items-center", getBorderRadius(shape), className)}
          style={{
            backgroundColor: fallbackBackgroundColor ?? "rgba(var(--color-primary-500))",
            color: fallbackTextColor ?? "#ffffff",
          }}
        >
          {fallbackLetter}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
    </div>
  );

  if (showTooltip && name) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{avatarElement}</TooltipTrigger>
          <TooltipContent>{name}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return avatarElement;
}
