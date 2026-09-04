'use client';

import { useState } from 'react';
import { Check, ChevronDown, Copy, Pencil, Save, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Popover, PopoverContent, PopoverTrigger, usePopoverClose } from '@/components/ui/Popover';
import {
  useCreateCrmSavedView,
  useCrmSavedViews,
  useDeleteCrmSavedView,
  useDuplicateCrmSavedView,
  useSetDefaultCrmSavedView,
  useUpdateCrmSavedView,
} from '@/hooks/crm/useCrmSavedViews';
import { cn } from '@/lib/cn';
import type { CrmSavedView, CrmSavedViewObjectType } from '@/hooks/crm/types';

/**
 * Save-current-filter / switch-between-views bar for a collection page.
 * `currentState` is whatever { filterJson, sortJson, columnJson, viewMode }
 * the caller currently has applied — saved as-is on "Save as new view".
 * Rename/duplicate/set-default/delete live in the dropdown next to each
 * saved view row.
 */
export function SavedViewBar({
  objectType,
  activeViewId,
  onSelectView,
  currentState,
}: {
  objectType: CrmSavedViewObjectType;
  activeViewId: string | null;
  onSelectView: (view: CrmSavedView | null) => void;
  currentState: { filterJson?: Record<string, unknown>; sortJson?: Record<string, unknown>; columnJson?: string[]; viewMode?: string };
}) {
  const { data } = useCrmSavedViews({ objectType });
  const views = data?.data || [];
  const createView = useCreateCrmSavedView();
  const updateView = useUpdateCrmSavedView();
  const deleteView = useDeleteCrmSavedView();
  const duplicateView = useDuplicateCrmSavedView();
  const setDefaultView = useSetDefaultCrmSavedView();

  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const activeView = views.find((v) => v.id === activeViewId);

  function saveAsNewView() {
    const name = newName.trim();
    if (!name) return;
    createView.mutate(
      { name, objectType, ...currentState },
      {
        onSuccess: (created) => {
          setNewName('');
          onSelectView(created);
        },
      }
    );
  }

  function submitRename(view: CrmSavedView) {
    const name = renameValue.trim();
    if (!name || name === view.name) {
      setRenamingId(null);
      return;
    }
    updateView.mutate({ id: view.id, name }, { onSuccess: () => setRenamingId(null) });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700 hover:border-ink-300 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
          >
            {activeView ? activeView.name : 'All records'}
            <ChevronDown className="h-3.5 w-3.5 text-ink-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" width="w-72">
          <button
            type="button"
            onClick={() => onSelectView(null)}
            className={cn(
              'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-ink-50 dark:hover:bg-ink-800',
              !activeViewId && 'font-semibold text-brand-700 dark:text-brand-400'
            )}
          >
            All records
            {!activeViewId && <Check className="h-3.5 w-3.5" />}
          </button>
          <div className="my-1 h-px bg-ink-100 dark:bg-ink-800" />
          <div className="max-h-64 space-y-0.5 overflow-y-auto">
            {views.map((view) => (
              <SavedViewRow
                key={view.id}
                view={view}
                active={view.id === activeViewId}
                isRenaming={renamingId === view.id}
                renameValue={renameValue}
                onSelect={() => onSelectView(view)}
                onStartRename={() => {
                  setRenamingId(view.id);
                  setRenameValue(view.name);
                }}
                onRenameChange={setRenameValue}
                onSubmitRename={() => submitRename(view)}
                onDuplicate={() => duplicateView.mutate(view.id)}
                onSetDefault={() => setDefaultView.mutate(view.id)}
                onDelete={() => {
                  deleteView.mutate(view.id);
                  if (view.id === activeViewId) onSelectView(null);
                }}
              />
            ))}
            {views.length === 0 && <p className="px-2.5 py-3 text-center text-xs text-ink-400 dark:text-ink-500">No saved views yet.</p>}
          </div>
          <div className="my-1 h-px bg-ink-100 dark:bg-ink-800" />
          <div className="flex items-center gap-1.5 px-1 py-1">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Save current filters as…" className="h-8 flex-1 text-xs" />
            <Button size="sm" onClick={saveAsNewView} disabled={!newName.trim()} loading={createView.isPending}>
              <Save className="h-3.5 w-3.5" />
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function SavedViewRow({
  view,
  active,
  isRenaming,
  renameValue,
  onSelect,
  onStartRename,
  onRenameChange,
  onSubmitRename,
  onDuplicate,
  onSetDefault,
  onDelete,
}: {
  view: CrmSavedView;
  active: boolean;
  isRenaming: boolean;
  renameValue: string;
  onSelect: () => void;
  onStartRename: () => void;
  onRenameChange: (v: string) => void;
  onSubmitRename: () => void;
  onDuplicate: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  const closePopover = usePopoverClose();

  if (isRenaming) {
    return (
      <div className="flex items-center gap-1 px-2 py-1">
        <Input
          autoFocus
          value={renameValue}
          onChange={(e) => onRenameChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmitRename()}
          className="h-8 flex-1 text-xs"
        />
        <button type="button" onClick={onSubmitRename} className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10">
          <Check className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn('group flex items-center gap-1 rounded-lg px-1 hover:bg-ink-50 dark:hover:bg-ink-800', active && 'bg-brand-50/60 dark:bg-brand-500/10')}>
      <button
        type="button"
        onClick={() => {
          onSelect();
          closePopover();
        }}
        className={cn('flex flex-1 items-center gap-1.5 truncate px-1.5 py-1.5 text-left text-sm', active ? 'font-semibold text-brand-700 dark:text-brand-400' : 'text-ink-700 dark:text-ink-200')}
      >
        {view.is_default && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
        <span className="truncate">{view.name}</span>
      </button>
      <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
        <button type="button" onClick={onSetDefault} title="Set as default" className="rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-amber-500 dark:hover:bg-ink-700">
          <Star className="h-3 w-3" />
        </button>
        <button type="button" onClick={onStartRename} title="Rename" className="rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-700">
          <Pencil className="h-3 w-3" />
        </button>
        <button type="button" onClick={onDuplicate} title="Duplicate" className="rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-700">
          <Copy className="h-3 w-3" />
        </button>
        <button type="button" onClick={onDelete} title="Delete" className="rounded-md p-1 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
