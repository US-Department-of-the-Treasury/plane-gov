import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { CircleMinus } from "lucide-react";
import { Disclosure } from "@headlessui/react";
// plane imports
import { ROLE, EUserPermissions, MEMBER_TRACKER_ELEMENTS } from "@plane/constants";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { EUserProjectRoles, IUser, IWorkspaceMember, TProjectMembership } from "@plane/types";
import { CustomMenu, CustomSelect } from "@plane/ui";
import { getFileURL } from "@plane/utils";
// hooks
import { useUser, useUserPermissions } from "@/hooks/store/user";
// queries
import { useWorkspaceMembers, useUpdateProjectMemberRole, getWorkspaceMemberByUserId } from "@/store/queries/member";

export interface RowData extends Pick<TProjectMembership, "original_role"> {
  member: IWorkspaceMember;
}

type NameProps = {
  rowData: RowData;
  workspaceSlug: string;
  isAdmin: boolean;
  currentUser: IUser | undefined;
  setRemoveMemberModal: (rowData: RowData) => void;
};

type AccountTypeProps = {
  rowData: RowData;
  currentProjectRole: EUserPermissions | undefined;
  workspaceSlug: string;
  projectId: string;
};

export function NameColumn(props: NameProps) {
  const { rowData, workspaceSlug, isAdmin, currentUser, setRemoveMemberModal } = props;
  // derived values
  const { avatar_url, display_name, email, first_name, id, last_name } = rowData.member;

  return (
    <Disclosure>
      {({}) => (
        <div className="relative group">
          <div className="flex items-center gap-2 w-72">
            <div className="flex items-center gap-x-2 gap-y-2 flex-1">
              {avatar_url && avatar_url.trim() !== "" ? (
                <Link href={`/${workspaceSlug}/profile/${id}`}>
                  <span className="relative flex size-4 items-center justify-center rounded-full capitalize text-on-color">
                    <img
                      src={getFileURL(avatar_url)}
                      className="absolute left-0 top-0 h-full w-full rounded-full object-cover"
                      alt={display_name || email}
                    />
                  </span>
                </Link>
              ) : (
                <Link href={`/${workspaceSlug}/profile/${id}`}>
                  <span className="relative flex size-4 items-center justify-center rounded-full bg-gray-700 capitalize text-on-color text-11">
                    {(email ?? display_name ?? "?")[0]}
                  </span>
                </Link>
              )}
              {first_name} {last_name}
            </div>
            {(isAdmin || id === currentUser?.id) && (
              <CustomMenu
                ellipsis
                buttonClassName="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                optionsClassName="p-1.5"
                placement="bottom-end"
              >
                <CustomMenu.MenuItem>
                  <div
                    className="flex items-center gap-x-1 cursor-pointer text-red-600 font-medium"
                    data-ph-element={MEMBER_TRACKER_ELEMENTS.PROJECT_MEMBER_TABLE_CONTEXT_MENU}
                    onClick={() => setRemoveMemberModal(rowData)}
                  >
                    <CircleMinus className="flex-shrink-0 size-3.5" />
                    {rowData.member?.id === currentUser?.id ? "Leave " : "Remove "}
                  </div>
                </CustomMenu.MenuItem>
              </CustomMenu>
            )}
          </div>
        </div>
      )}
    </Disclosure>
  );
}

export function AccountTypeColumn(props: AccountTypeProps) {
  const { rowData, projectId, workspaceSlug } = props;
  // store hooks
  const { data: currentUser } = useUser();
  const { getProjectRoleByWorkspaceSlugAndProjectId } = useUserPermissions();
  // queries
  const { data: workspaceMembers = [] } = useWorkspaceMembers(workspaceSlug);
  const { mutateAsync: updateMemberRole } = useUpdateProjectMemberRole();
  // form info
  const {
    control,
    formState: { errors },
  } = useForm();
  // derived values
  const roleLabel = ROLE[rowData.original_role ?? EUserPermissions.GUEST];
  const isCurrentUser = currentUser?.id === rowData.member.id;
  const rowWorkspaceMember = getWorkspaceMemberByUserId(workspaceMembers, rowData.member.id);
  const currentWorkspaceMember = currentUser ? getWorkspaceMemberByUserId(workspaceMembers, currentUser.id) : null;
  const isRowDataWorkspaceAdmin = [EUserPermissions.ADMIN].includes(
    Number(rowWorkspaceMember?.role) ?? EUserPermissions.GUEST
  );
  const isCurrentUserWorkspaceAdmin = currentUser
    ? [EUserPermissions.ADMIN].includes(Number(currentWorkspaceMember?.role) ?? EUserPermissions.GUEST)
    : false;
  const currentProjectRole = getProjectRoleByWorkspaceSlugAndProjectId(workspaceSlug, projectId);

  const isCurrentUserProjectAdmin = currentProjectRole
    ? ![EUserPermissions.MEMBER, EUserPermissions.GUEST].includes(Number(currentProjectRole) ?? EUserPermissions.GUEST)
    : false;

  // logic
  // Workspace admin can change his own role
  // Project admin can change any role except his own and workspace admin's role
  const isRoleEditable =
    (isCurrentUserWorkspaceAdmin && isCurrentUser) ||
    (isCurrentUserProjectAdmin && !isRowDataWorkspaceAdmin && !isCurrentUser);
  const checkCurrentOptionWorkspaceRole = (userId: string) => {
    const memberData = getWorkspaceMemberByUserId(workspaceMembers, userId);
    const currentMemberWorkspaceRole = memberData?.role as EUserPermissions | undefined;
    if (!userId || !currentMemberWorkspaceRole) return ROLE;

    const isGuest = [EUserPermissions.GUEST].includes(currentMemberWorkspaceRole);

    return Object.fromEntries(
      Object.entries(ROLE).filter(([key]) => !isGuest || parseInt(key) === EUserPermissions.GUEST)
    );
  };

  return (
    <>
      {isRoleEditable ? (
        <Controller
          name="role"
          control={control}
          rules={{ required: "Role is required." }}
          render={() => (
            <CustomSelect
              value={rowData.original_role}
              onChange={async (value: EUserProjectRoles) => {
                if (!workspaceSlug) return;
                await updateMemberRole({
                  workspaceSlug: workspaceSlug.toString(),
                  projectId: projectId.toString(),
                  memberId: rowData.member.id,
                  role: value,
                }).catch((err) => {
                  console.log(err, "err");
                  const error = err.error;
                  const errorString = Array.isArray(error) ? error[0] : error;

                  setToast({
                    type: TOAST_TYPE.ERROR,
                    title: "You can't change this role yet.",
                    message: errorString ?? "An error occurred while updating member role. Please try again.",
                  });
                });
              }}
              label={
                <div className="flex ">
                  <span>{roleLabel}</span>
                </div>
              }
              buttonClassName={`!px-0 !justify-start hover:bg-surface-1 ${errors.role ? "border-red-500" : "border-none"}`}
              className="rounded-md p-0 w-32"
              input
            >
              {Object.entries(checkCurrentOptionWorkspaceRole(rowData.member.id)).map(([key, label]) => (
                <CustomSelect.Option key={key} value={key}>
                  {label}
                </CustomSelect.Option>
              ))}
            </CustomSelect>
          )}
        />
      ) : (
        <div className="w-32 flex ">
          <span>{roleLabel}</span>
        </div>
      )}
    </>
  );
}
