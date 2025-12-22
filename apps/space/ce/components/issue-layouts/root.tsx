import { PageNotFound } from "@/components/ui/not-found";

type Props = {
  anchor: string;
  peekId: string | undefined;
};

export function ViewLayoutsRoot(_props: Props) {
  return <PageNotFound />;
}
