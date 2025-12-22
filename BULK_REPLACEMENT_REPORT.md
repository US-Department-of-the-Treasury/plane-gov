# Bulk Text Replacement Report: Module → Epic

## Summary
Successfully completed bulk text replacement of Module→Epic patterns across 298 TypeScript/TSX files in the plane-rename-module-to-epic worktree.

## Directories Processed
- `/Users/corcoss/code/plane-rename-module-to-epic/packages/types/src/epic/`
- `/Users/corcoss/code/plane-rename-module-to-epic/packages/services/src/epic/`
- `/Users/corcoss/code/plane-rename-module-to-epic/packages/constants/src/`
- `/Users/corcoss/code/plane-rename-module-to-epic/apps/web/core/store/`
- `/Users/corcoss/code/plane-rename-module-to-epic/apps/web/core/hooks/`
- `/Users/corcoss/code/plane-rename-module-to-epic/apps/web/core/components/epics/`

## Files Updated: 298

## Replacement Patterns Applied

### 1. Type Definitions & Interfaces
- `IModule` → `IEpic`
- `IModuleStore` → `IEpicStore`
- `TModule*` → `TEpic*` (all type aliases starting with TModule)
- `ModuleIssueResponse` → `EpicIssueResponse`
- `ModuleLink` → `EpicLink`
- `SelectModuleType` → `SelectEpicType`
- `TPublicModule` → `TPublicEpic`

### 2. Service & Store Classes
- `ModuleService` → `EpicService`
- `ModulesStore` → `EpicsStore`
- `ModuleStore` → `EpicStore`
- `ModuleFilter` → `EpicFilter`
- `ModuleLinkService` → `EpicLinkService`
- `ModuleOperationService` → `EpicOperationService`
- `SitesModuleService` → `SitesEpicService`
- `ModuleArchiveService` → `EpicArchiveService`

### 3. Constants (All-Caps)
- `MODULE_STATUS_COLORS` → `EPIC_STATUS_COLORS`
- `MODULE_STATUS` → `EPIC_STATUS`
- `MODULE_VIEW_LAYOUTS` → `EPIC_VIEW_LAYOUTS`
- `MODULE_ORDER_BY_OPTIONS` → `EPIC_ORDER_BY_OPTIONS`
- `MODULE_TRACKER_EVENTS` → `EPIC_TRACKER_EVENTS`

### 4. Component Names
- `ModuleForm` → `EpicForm`
- `ModuleCardItem` → `EpicCardItem`
- `ModuleListItem` → `EpicListItem`
- `ModuleListItemAction` → `EpicListItemAction`
- `ModulePeekOverview` → `EpicPeekOverview`
- `ModuleViewHeader` → `EpicViewHeader`
- `ModulesListView` → `EpicsListView`
- `DeleteModuleModal` → `DeleteEpicModal`
- `ModuleStatusDropdown` → `EpicStatusDropdown`
- `ModuleLayoutIcon` → `EpicLayoutIcon`
- `ModuleAnalyticsSidebar` → `EpicAnalyticsSidebar`
- `ModuleAppliedFilters` → `EpicAppliedFilters`
- `ModuleDropdown` → `EpicDropdown`
- `ModuleQuickActions` → `EpicQuickActions`

### 5. Hook Names
- `useModule` → `useEpic`

### 6. Method Names (Sample - all variations updated)
- `fetchWorkspaceModules` → `fetchWorkspaceEpics`
- `fetchModules` → `fetchEpics`
- `fetchModulesSlim` → `fetchEpicsSlim`
- `fetchArchivedModules` → `fetchArchivedEpics`
- `fetchModuleDetails` → `fetchEpicDetails`
- `createModule` → `createEpic`
- `updateModuleDetails` → `updateEpicDetails`
- `deleteModule` → `deleteEpic`
- `createModuleLink` → `createEpicLink`
- `updateModuleLink` → `updateEpicLink`
- `deleteModuleLink` → `deleteEpicLink`
- `addModuleToFavorites` → `addEpicToFavorites`
- `removeModuleFromFavorites` → `removeEpicFromFavorites`
- `archiveModule` → `archiveEpic`
- `restoreModule` → `restoreEpic`
- `getModuleIssues` → `getEpicIssues`
- `addIssuesToModule` → `addIssuesToEpic`
- `addModulesToIssue` → `addEpicsToIssue`
- `removeIssuesFromModuleBulk` → `removeIssuesFromEpicBulk`
- `removeModulesFromIssueBulk` → `removeEpicsFromIssueBulk`
- `getModuleById` → `getEpicById`
- `getModuleNameById` → `getEpicNameById`
- `orderModules` → `orderEpics`
- `shouldFilterModule` → `shouldFilterEpic`

### 7. Parameters & Variables (Plural forms before singular)
- `moduleIds` → `epicIds`
- `moduleId` → `epicId`
- `moduleStore` → `epicStore`
- `moduleService` → `epicService`
- `moduleArchiveService` → `epicArchiveService`
- `moduleFilter` → `epicFilter`
- `moduleData` → `epicData`
- `moduleDetails` → `epicDetails`
- `moduleMap` → `epicMap`
- `projectModuleIds` → `projectEpicIds`
- `projectArchivedModuleIds` → `projectArchivedEpicIds`

### 8. Object Properties
- `link_module` → `link_epic`
- `module_detail` → `epic_detail`
- `removed_modules` → `removed_epics`

### 9. String Literals
- `"modules"` → `"epics"`
- `"module"` → `"epic"`
- `'modules'` → `'epics'`
- `'module'` → `'epic'`

### 10. URL Patterns
- `/modules/` → `/epics/`
- `/module-links/` → `/epic-links/`
- `user-favorite-modules` → `user-favorite-epics`

### 11. Import Paths
- `@/services/module.service` → `@/services/epic.service`
- `@/services/module_archive.service` → `@/services/epic_archive.service`
- `@/store/module.store` → `@/store/epic.store`
- `@/hooks/store/use-module` → `@/hooks/store/use-epic`
- `@/hooks/store/use-module-filter` → `@/hooks/store/use-epic-filter`
- `@/components/modules` → `@/components/epics`

### 12. Directory Renames
- `archived-modules/` → `archived-epics/`

## Verification Results
✅ No remaining `IModule` references in key files
✅ No remaining `ModuleService` references in store files  
✅ No remaining `TModule` references in type files
✅ Import paths updated correctly
✅ Context properties updated (`context.module` → `context.epic`)

## Key Files Verified
- `/Users/corcoss/code/plane-rename-module-to-epic/packages/types/src/epic/epics.ts`
- `/Users/corcoss/code/plane-rename-module-to-epic/packages/types/src/epic/epic_filters.ts`
- `/Users/corcoss/code/plane-rename-module-to-epic/packages/services/src/epic/epic.service.ts`
- `/Users/corcoss/code/plane-rename-module-to-epic/packages/services/src/epic/link.service.ts`
- `/Users/corcoss/code/plane-rename-module-to-epic/packages/services/src/epic/operations.service.ts`
- `/Users/corcoss/code/plane-rename-module-to-epic/packages/services/src/epic/sites-epic.service.ts`
- `/Users/corcoss/code/plane-rename-module-to-epic/packages/constants/src/epic.ts`
- `/Users/corcoss/code/plane-rename-module-to-epic/apps/web/core/store/epic.store.ts`
- `/Users/corcoss/code/plane-rename-module-to-epic/apps/web/core/hooks/store/use-epic.ts`
- `/Users/corcoss/code/plane-rename-module-to-epic/apps/web/core/components/epics/modal.tsx`

## Notes
- All replacements were performed using Perl regular expressions with word boundaries to ensure accurate matching
- Replacements were applied in order of specificity (most specific patterns first) to avoid partial replacements
- Two passes were performed to catch all patterns including interface names and import paths
- String literals in both double quotes and single quotes were updated
- URL patterns and API endpoints were updated
