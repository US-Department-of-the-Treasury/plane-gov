import { DialogTitle } from "@plane/propel/primitives";

type TInvitationFormProps = {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
  onSubmit: () => void;
  actions: React.ReactNode;
  className?: string;
};

export function InvitationForm(props: TInvitationFormProps) {
  const { title, description, children, actions, onSubmit, className } = props;

  return (
    <form onSubmit={onSubmit} className={className}>
      <div className="space-y-4">
        <DialogTitle className="text-body-md-medium leading-6 text-primary">
          {title}
        </DialogTitle>
        <div className="text-body-xs-regular text-secondary">{description}</div>
        {children}
      </div>
      {actions}
    </form>
  );
}
