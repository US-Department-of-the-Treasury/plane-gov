import type { TLogoProps } from "./common";

export type TSticky = {
  id: string;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by: string;
  name: string | null;
  description: object;
  description_html: string;
  description_stripped: string | null;
  description_binary: string | null;
  logo_props: TLogoProps;
  color: string | null;
  background_color: string | null;
  workspace: string;
  owner: string;
  sort_order: number;
};
