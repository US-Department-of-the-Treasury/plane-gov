import { Command } from "cmdk";
// plane imports
import { Avatar } from "@plane/ui";
import { getFileURL } from "@plane/utils";
// local imports
import { PowerKModalCommandItem } from "../ui/modal/command-item";

type Props = {
  handleSelect: (assigneeId: string) => void;
  heading?: string;
  members: Array<{ id: string; display_name: string; avatar_url?: string }>;
  value: string[];
};

export function PowerKMembersMenu(props: Props) {
  const { handleSelect, heading, members, value } = props;

  return (
    <Command.Group heading={heading}>
      {members.map((member) => (
        <PowerKModalCommandItem
          key={member.id}
          iconNode={
            <Avatar
              name={member.display_name}
              src={getFileURL(member.avatar_url ?? "")}
              showTooltip={false}
              className="shrink-0"
            />
          }
          isSelected={value.includes(member.id)}
          label={member.display_name}
          onSelect={() => handleSelect(member.id)}
        />
      ))}
    </Command.Group>
  );
}
