'use client';

import { Typography, ActivityItem, ActivityItemProps } from '@/src/components/atoms';

export interface RecentFraudAlertsProps {
  activities: ActivityItemProps[];
  className?: string;
}

export function RecentFraudAlerts({ activities, className }: RecentFraudAlertsProps) {
  return (
    <div className={`bg-[var(--clr-surface-a10)] border-2 border-border rounded-lg shadow-sm ${className || ''}`}>
      <div className="p-6 border-b-2 border-border">
        <Typography variant="h3" size="lg" weight="semibold" className="text-foreground">
          Recent Fraud Alerts
        </Typography>
        <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mt-1.5">
          Latest fraud detection activities and system events
        </Typography>
      </div>
      <div className="divide-y divide-border">
        {activities.length === 0 ? (
          <div className="p-8 text-center">
            <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
              No recent activities
            </Typography>
          </div>
        ) : (
          activities.map((activity) => (
            <ActivityItem key={activity.id} {...activity} />
          ))
        )}
      </div>
    </div>
  );
}

