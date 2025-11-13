'use client';

import { Typography, ActivityItem, ActivityItemProps } from '@/src/components/atoms';

export interface RecentFraudAlertsProps {
  activities: ActivityItemProps[];
  className?: string;
}

export function RecentFraudAlerts({ activities, className }: RecentFraudAlertsProps) {
  return (
    <div className={`bg-card border border-border rounded-lg ${className || ''}`}>
      <div className="p-6 border-b border-border">
        <Typography variant="h3" size="lg" weight="semibold" className="text-foreground">
          Recent Fraud Alerts
        </Typography>
        <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mt-1">
          Latest fraud detection activities and system events
        </Typography>
      </div>
      <div className="divide-y divide-border">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} {...activity} />
        ))}
      </div>
    </div>
  );
}

