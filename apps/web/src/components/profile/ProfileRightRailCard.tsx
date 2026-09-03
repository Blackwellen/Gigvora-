import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export function ProfileRightRailCard({
  title,
  action,
  beta,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  beta?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        action={
          <div className="flex items-center gap-2">
            {beta && <Badge tone="brand">Beta</Badge>}
            {action}
          </div>
        }
      />
      <div className="px-5 pb-4 pt-2">{children}</div>
    </Card>
  );
}
