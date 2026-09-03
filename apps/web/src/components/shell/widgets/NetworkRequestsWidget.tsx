'use client';

import { Users, Check, X, Loader2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { usePendingConnectionRequests, useRespondToConnectionRequest, type ConnectionRequest } from '@/hooks/useConnections';
import { WidgetDropdown, WidgetLoadingSkeleton, WidgetEmptyState, WidgetErrorState } from './WidgetDropdown';

export function NetworkRequestsWidget() {
  const { data, isLoading, isError } = usePendingConnectionRequests(8);
  const respond = useRespondToConnectionRequest();

  const requests = data?.data || [];
  const total = data?.meta.total ?? requests.length;

  return (
    <WidgetDropdown
      label="Network requests"
      icon={Users}
      count={total}
      title="Network requests"
      viewAllHref="/app/network?tab=invitations"
      dataTourAnchor="network"
    >
      {isLoading && <WidgetLoadingSkeleton />}
      {isError && <WidgetErrorState />}
      {!isLoading && !isError && requests.length === 0 && (
        <WidgetEmptyState icon={Users} message="No pending requests" hint="New connection requests will show up here." />
      )}
      {!isLoading && requests.length > 0 && (
        <ul className="space-y-1">
          {requests.map((request) => (
            <ConnectionRequestRow
              key={request.id}
              request={request}
              onAccept={() => respond.mutate({ id: request.id, status: 'accepted' })}
              onDecline={() => respond.mutate({ id: request.id, status: 'declined' })}
              isPending={respond.isPending && respond.variables?.id === request.id}
            />
          ))}
        </ul>
      )}
    </WidgetDropdown>
  );
}

function ConnectionRequestRow({
  request,
  onAccept,
  onDecline,
  isPending,
}: {
  request: ConnectionRequest;
  onAccept: () => void;
  onDecline: () => void;
  isPending: boolean;
}) {
  const name = `${request.requester_first_name} ${request.requester_last_name}`.trim();

  return (
    <li className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-ink-50 dark:hover:bg-ink-800">
      <Avatar name={name} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">{name}</span>
        {request.requester_headline && (
          <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{request.requester_headline}</span>
        )}
      </span>
      {isPending ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-300" />
      ) : (
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onAccept}
            aria-label={`Accept ${name}`}
            title="Accept"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDecline}
            aria-label={`Decline ${name}`}
            title="Decline"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-100 text-ink-500 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-400 dark:hover:bg-ink-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      )}
    </li>
  );
}
