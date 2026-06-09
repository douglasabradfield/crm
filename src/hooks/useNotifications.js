import { useMemo } from 'react';
import { useCRM } from '../store/crm.js';

const today = () => new Date().toISOString().split('T')[0];

/**
 * Derives notification badges from live CRM state.
 * Returns arrays ready for the Topbar / Sidebar badges.
 */
export function useNotifications() {
  const { leads } = useCRM();
  const now = today();

  const notifications = useMemo(() => {
    const overdue = leads.filter(
      (l) => !l.convertido && l.daysSinceContact >= 7,
    );

    const followUpHoje = leads.filter(
      (l) => !l.convertido && l.followUpDate === now,
    );

    const followUpVencido = leads.filter(
      (l) => !l.convertido && l.followUpDate && l.followUpDate < now,
    );

    const all = [
      ...overdue.map((l) => ({
        id: `overdue-${l.id}`,
        type: 'warning',
        title: 'Follow-up vencido',
        message: `${l.company} — ${l.daysSinceContact} dias sem contato`,
        link: '/crm',
      })),
      ...followUpVencido
        .filter((l) => !overdue.find((o) => o.id === l.id))
        .map((l) => ({
          id: `fu-vencido-${l.id}`,
          type: 'warning',
          title: 'Follow-up atrasado',
          message: `${l.company} — prazo era ${l.followUpDate.split('-').reverse().join('/')}`,
          link: '/crm',
        })),
      ...followUpHoje.map((l) => ({
        id: `fu-hoje-${l.id}`,
        type: 'info',
        title: 'Follow-up hoje',
        message: `${l.company} — ${l.contact}`,
        link: '/crm',
      })),
    ];

    return {
      all,
      count: all.length,
      overdueCount: overdue.length + followUpVencido.filter((l) => !overdue.find((o) => o.id === l.id)).length,
      todayCount: followUpHoje.length,
    };
  }, [leads, now]);

  return notifications;
}
