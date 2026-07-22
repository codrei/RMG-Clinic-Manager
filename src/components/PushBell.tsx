import { useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { disablePush, enablePush, pushEnabled, type PushError } from '../lib/push';
import { toast } from '../lib/toast';

const ERROR_MESSAGES: Record<PushError, string> = {
  'not-configured': 'Booking alerts aren’t set up yet (missing notification key).',
  unsupported: 'This browser can’t receive notifications — use the installed app.',
  denied: 'Notifications are blocked for this app — allow them in your phone’s settings.',
  failed: 'Couldn’t turn on alerts. Check your connection and try again.',
};

/** Header bell: toggles new-booking push alerts for THIS device. */
export function PushBell() {
  const [enabled, setEnabled] = useState(pushEnabled);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
        toast.info('Booking alerts are off for this device.');
      } else {
        const err = await enablePush();
        if (err) {
          toast.error(ERROR_MESSAGES[err]);
        } else {
          setEnabled(true);
          toast.success('Booking alerts on — this device is notified the moment someone books.');
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 rounded-lg border p-2 text-sm font-medium transition-colors ${
        enabled
          ? 'border-accent/40 bg-accent-soft text-accent-ink'
          : 'border-border text-muted-foreground hover:text-foreground'
      }`}
      aria-label={enabled ? 'Turn off booking alerts' : 'Turn on booking alerts'}
      title={enabled ? 'Booking alerts are ON for this device' : 'Get notified when someone books'}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : enabled ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
    </button>
  );
}
