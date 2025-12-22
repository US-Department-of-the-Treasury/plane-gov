"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, BookOpen } from "lucide-react";
// plane imports
import { Button } from "@plane/propel/button";
import { Breadcrumbs, Header } from "@plane/ui";
// components
import { BreadcrumbLink } from "@/components/common/breadcrumb-link";
import { CreateWikiPageModal } from "@/components/wiki/modals";

export function WikiListHeader() {
  const { workspaceSlug } = useParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <>
      <Header>
        <Header.LeftItem>
          <div className="flex items-center gap-2.5">
            <Breadcrumbs>
              <Breadcrumbs.Item
                component={
                  <BreadcrumbLink
                    label="Wiki"
                    icon={<BookOpen className="size-5 text-secondary" />}
                  />
                }
              />
            </Breadcrumbs>
          </div>
        </Header.LeftItem>

        <Header.RightItem>
          <Button
            variant="primary"
            size="lg"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="size-4 mr-1" />
            New Page
          </Button>
        </Header.RightItem>
      </Header>

      <CreateWikiPageModal
        workspaceSlug={workspaceSlug?.toString() ?? ""}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
}
