"use client";

import { FolderOpen, Construction } from "lucide-react";

export default function ResourcesPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="flex flex-col items-center gap-4 max-w-md text-center">
        <div className="p-4 bg-custom-primary-100/10 rounded-full">
          <FolderOpen className="size-12 text-custom-primary-100" />
        </div>
        <h1 className="text-2xl font-semibold text-custom-text-100">Resources</h1>
        <div className="flex items-center gap-2 text-custom-text-300">
          <Construction className="size-4" />
          <span>Coming Soon</span>
        </div>
        <p className="text-sm text-custom-text-400">
          This feature is under development. Resources will allow you to organize and manage shared files, links, and
          documents across your workspace.
        </p>
      </div>
    </div>
  );
}
