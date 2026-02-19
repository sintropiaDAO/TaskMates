import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { useState } from 'react';

export interface TaskSettings {
  allowCollaboration: boolean;
  allowRequests: boolean;
  autoApproveCollaborators: boolean;
  autoApproveRequesters: boolean;
  maxCollaborators: number | null;
  maxRequesters: number | null;
  repeatType: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' | null;
  repeatConfig: {
    frequency?: number;
    unit?: 'week' | 'month' | 'year';
    daysOfWeek?: number[];
  } | null;
  repeatEndDate: string | null;
  repeatOccurrences: number | null;
  repeatEndMode: 'date' | 'occurrences' | null;
  enableStreak: boolean;
}

export const DEFAULT_TASK_SETTINGS: TaskSettings = {
  allowCollaboration: true,
  allowRequests: true,
  autoApproveCollaborators: false,
  autoApproveRequesters: false,
  maxCollaborators: null,
  maxRequesters: null,
  repeatType: null,
  repeatConfig: null,
  repeatEndDate: null,
  repeatOccurrences: null,
  repeatEndMode: null,
  enableStreak: false,
};

interface TaskSettingsPanelProps {
  settings: TaskSettings;
  onChange: (settings: TaskSettings) => void;
  readOnly?: boolean;
  onSaveField?: (field: string, value: unknown) => void;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_NUMS = [1, 2, 3, 4, 5, 6, 0]; // Mon=1...Sun=0

export function TaskSettingsPanel({ settings, onChange, readOnly, onSaveField }: TaskSettingsPanelProps) {
  const { t, language } = useLanguage();
  const locale = language === 'pt' ? ptBR : enUS;

  const update = (partial: Partial<TaskSettings>) => {
    const next = { ...settings, ...partial };
    onChange(next);
    if (onSaveField) {
      Object.entries(partial).forEach(([k, v]) => onSaveField(k, v));
    }
  };

  const toggleDayOfWeek = (dayNum: number) => {
    const current = settings.repeatConfig?.daysOfWeek || [];
    const next = current.includes(dayNum) ? current.filter(d => d !== dayNum) : [...current, dayNum];
    update({ repeatConfig: { ...settings.repeatConfig, daysOfWeek: next } });
  };

  const isRepeatActive = !!settings.repeatType;
  const isCustomRepeat = settings.repeatType === 'custom';

  return (
    <div className="space-y-4">
      {/* Allow Collaboration */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm">{t('allowCollaboration')}</span>
          <Switch
            checked={settings.allowCollaboration}
            onCheckedChange={(v) => {
              const next: Partial<TaskSettings> = { allowCollaboration: v };
              if (!v) next.autoApproveCollaborators = false;
              update(next);
            }}
            disabled={readOnly}
          />
        </div>

        {/* Auto-approve collaborators */}
        <div className={cn("ml-4 space-y-1", !settings.allowCollaboration && "opacity-50")}>
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-2">
              <span className="text-xs">{t('autoApproveCollaborators')}</span>
              <p className="text-xs text-muted-foreground">{t('autoApproveCollaboratorsDesc')}</p>
            </div>
            <Switch
              checked={settings.autoApproveCollaborators}
              onCheckedChange={(v) => {
                const next: Partial<TaskSettings> = { autoApproveCollaborators: v };
                if (!v) next.maxCollaborators = null;
                update(next);
              }}
              disabled={readOnly || !settings.allowCollaboration}
            />
          </div>

          {/* Max collaborators */}
          {settings.autoApproveCollaborators && (
            <div className="mt-2">
              <Label className="text-xs">{t('limitParticipants')} ({t('maxCollaborators')})</Label>
              <Input
                type="number"
                min={1}
                placeholder="∞"
                value={settings.maxCollaborators ?? ''}
                onChange={(e) => update({ maxCollaborators: e.target.value ? parseInt(e.target.value) : null })}
                disabled={readOnly}
                className="h-8 text-sm mt-1"
              />
            </div>
          )}
        </div>
      </div>

      {/* Allow Requests */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-sm">{t('allowRequests')}</span>
          <Switch
            checked={settings.allowRequests}
            onCheckedChange={(v) => {
              const next: Partial<TaskSettings> = { allowRequests: v };
              if (!v) next.autoApproveRequesters = false;
              update(next);
            }}
            disabled={readOnly}
          />
        </div>

        {/* Auto-approve requesters */}
        <div className={cn("ml-4 space-y-1", !settings.allowRequests && "opacity-50")}>
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-2">
              <span className="text-xs">{t('autoApproveRequesters')}</span>
              <p className="text-xs text-muted-foreground">{t('autoApproveRequestersDesc')}</p>
            </div>
            <Switch
              checked={settings.autoApproveRequesters}
              onCheckedChange={(v) => {
                const next: Partial<TaskSettings> = { autoApproveRequesters: v };
                if (!v) next.maxRequesters = null;
                update(next);
              }}
              disabled={readOnly || !settings.allowRequests}
            />
          </div>

          {/* Max requesters */}
          {settings.autoApproveRequesters && (
            <div className="mt-2">
              <Label className="text-xs">{t('limitParticipants')} ({t('maxRequesters')})</Label>
              <Input
                type="number"
                min={1}
                placeholder="∞"
                value={settings.maxRequesters ?? ''}
                onChange={(e) => update({ maxRequesters: e.target.value ? parseInt(e.target.value) : null })}
                disabled={readOnly}
                className="h-8 text-sm mt-1"
              />
            </div>
          )}
        </div>
      </div>

      {/* Repeat Task */}
      <div className="space-y-3 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t('repeatTask')}</span>
          <Switch
            checked={isRepeatActive}
            onCheckedChange={(v) => {
              if (!v) {
                update({ repeatType: null, repeatConfig: null, repeatEndDate: null, repeatOccurrences: null, repeatEndMode: null, enableStreak: false });
              } else {
                update({ repeatType: 'weekly' });
              }
            }}
            disabled={readOnly}
          />
        </div>

        {isRepeatActive && (
          <div className="space-y-3 ml-2">
            <Select
              value={settings.repeatType || 'weekly'}
              onValueChange={(v) => update({ repeatType: v as TaskSettings['repeatType'], repeatConfig: null })}
              disabled={readOnly}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t('repeatDaily')}</SelectItem>
                <SelectItem value="weekly">{t('repeatWeekly')}</SelectItem>
                <SelectItem value="monthly">{t('repeatMonthly')}</SelectItem>
                <SelectItem value="yearly">{t('repeatYearly')}</SelectItem>
                <SelectItem value="custom">{t('repeatCustom')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Custom repeat config */}
            {isCustomRepeat && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    className="h-8 text-sm w-20"
                    value={settings.repeatConfig?.frequency ?? 1}
                    onChange={(e) => update({ repeatConfig: { ...settings.repeatConfig, frequency: parseInt(e.target.value) || 1 } })}
                    disabled={readOnly}
                  />
                  <Select
                    value={settings.repeatConfig?.unit || 'week'}
                    onValueChange={(v) => update({ repeatConfig: { ...settings.repeatConfig, unit: v as 'week' | 'month' | 'year' } })}
                    disabled={readOnly}
                  >
                    <SelectTrigger className="h-8 text-sm flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">{t('repeatTimesPerWeek')}</SelectItem>
                      <SelectItem value="month">{t('repeatTimesPerMonth')}</SelectItem>
                      <SelectItem value="year">{t('repeatTimesPerYear')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Days of week selector */}
                <div className="space-y-1">
                  <Label className="text-xs">{t('repeatDaysOfWeek')}</Label>
                  <div className="flex gap-1 flex-wrap">
                    {DAYS.map((day, i) => {
                      const dayNum = DAY_NUMS[i];
                      const selected = settings.repeatConfig?.daysOfWeek?.includes(dayNum);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => !readOnly && toggleDayOfWeek(dayNum)}
                          className={cn(
                            "w-9 h-9 rounded-full text-xs font-medium border transition-colors",
                            selected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border text-muted-foreground hover:border-primary/50"
                          )}
                        >
                          {t(day)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* End condition */}
            <div className="space-y-2">
              <Label className="text-xs">{t('repeatEndsOn')} / {t('repeatEndsAfter')}</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={settings.repeatEndMode === 'date' ? 'default' : 'outline'}
                  className="text-xs h-7 flex-1"
                  onClick={() => !readOnly && update({ repeatEndMode: 'date', repeatOccurrences: null })}
                >
                  {t('repeatEndDate')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={settings.repeatEndMode === 'occurrences' ? 'default' : 'outline'}
                  className="text-xs h-7 flex-1"
                  onClick={() => !readOnly && update({ repeatEndMode: 'occurrences', repeatEndDate: null })}
                >
                  {t('repeatEndOccurrences')}
                </Button>
              </div>

              {settings.repeatEndMode === 'date' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full h-8 text-xs justify-start">
                      <CalendarIcon className="w-3 h-3 mr-2 shrink-0" />
                      <span className="truncate">
                        {settings.repeatEndDate
                          ? format(new Date(settings.repeatEndDate + 'T00:00:00'), 'PP', { locale })
                          : t('repeatEndDate')}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={settings.repeatEndDate ? new Date(settings.repeatEndDate + 'T00:00:00') : undefined}
                      onSelect={(d) => update({ repeatEndDate: d ? format(d, 'yyyy-MM-dd') : null })}
                      initialFocus
                      className="p-3 pointer-events-auto"
                      locale={locale}
                      disabled={(d) => d < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              )}

              {settings.repeatEndMode === 'occurrences' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    className="h-8 text-sm"
                    placeholder="1"
                    value={settings.repeatOccurrences ?? ''}
                    onChange={(e) => update({ repeatOccurrences: e.target.value ? parseInt(e.target.value) : null })}
                    disabled={readOnly}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{t('repeatOccurrences')}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Enable Streak */}
      <div className={cn("pt-2 border-t border-border/50 space-y-1", !isRepeatActive && "opacity-50")}>
        <div className="flex items-center justify-between">
          <div className="flex-1 mr-2">
            <span className="text-sm">{t('enableStreak')}</span>
            <p className="text-xs text-muted-foreground">{t('enableStreakDesc')}</p>
          </div>
          <Switch
            checked={settings.enableStreak}
            onCheckedChange={(v) => update({ enableStreak: v })}
            disabled={readOnly || !isRepeatActive}
          />
        </div>
      </div>
    </div>
  );
}
