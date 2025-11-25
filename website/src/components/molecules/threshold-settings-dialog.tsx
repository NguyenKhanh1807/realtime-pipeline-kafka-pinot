'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/src/components/atoms/button';
import { Input } from '@/src/components/atoms/input';
import { Typography } from '@/src/components/atoms/typography';
import { Card } from '@/src/components/atoms/card';
import { cn } from '@/src/lib/utils';
import { Save, RotateCcw, X } from 'lucide-react';

interface DayThreshold {
  day: string;
  normalMax: number;      // Max score for normal (label 0)
  warningMin: number;     // Min score for warning (label 1)
  warningMax: number;     // Max score for warning (label 1)
  bannedMin: number;      // Min score for banned (label 2)
}

interface ThresholdSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_THRESHOLDS: DayThreshold[] = [
  { day: 'Monday', normalMax: 59, warningMin: 60, warningMax: 90, bannedMin: 91 },
  { day: 'Tuesday', normalMax: 59, warningMin: 60, warningMax: 90, bannedMin: 91 },
  { day: 'Wednesday', normalMax: 59, warningMin: 60, warningMax: 90, bannedMin: 91 },
  { day: 'Thursday', normalMax: 59, warningMin: 60, warningMax: 90, bannedMin: 91 },
  { day: 'Friday', normalMax: 59, warningMin: 60, warningMax: 90, bannedMin: 91 },
  { day: 'Saturday', normalMax: 59, warningMin: 60, warningMax: 90, bannedMin: 91 },
  { day: 'Sunday', normalMax: 59, warningMin: 60, warningMax: 90, bannedMin: 91 },
];

export function ThresholdSettingsDialog({ open, onOpenChange }: ThresholdSettingsDialogProps) {
  const [thresholds, setThresholds] = useState<DayThreshold[]>(DEFAULT_THRESHOLDS);
  const [saving, setSaving] = useState(false);

  // Load saved thresholds from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('fraud_thresholds');
    if (saved) {
      try {
        setThresholds(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load thresholds:', e);
      }
    }
  }, []);

  const handleThresholdChange = (dayIndex: number, field: keyof Omit<DayThreshold, 'day'>, value: string) => {
    const numValue = parseInt(value) || 0;
    setThresholds((prev) =>
      prev.map((threshold, idx) =>
        idx === dayIndex ? { ...threshold, [field]: numValue } : threshold
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem('fraud_thresholds', JSON.stringify(thresholds));
      
      // Optionally save to backend
      // await fetch('/api/settings/thresholds', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(thresholds),
      // });
      
      setTimeout(() => {
        setSaving(false);
        onOpenChange(false);
      }, 500);
    } catch (error) {
      console.error('Failed to save thresholds:', error);
      setSaving(false);
    }
  };

  const handleReset = () => {
    setThresholds(DEFAULT_THRESHOLDS);
    localStorage.removeItem('fraud_thresholds');
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          
          {/* Modal */}
          <div className="relative z-10 w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-xl shadow-2xl border-2 border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-6 flex items-start justify-between rounded-t-xl">
              <div className="flex-1">
                <Typography variant="h2" size="xl" weight="bold" className="text-white mb-2">
                  Fraud Detection Thresholds
                </Typography>
                <Typography variant="p" size="base" className="text-blue-100">
                  Configure fraud score thresholds for each day of the week. These determine when transactions are flagged as normal, warning, or banned.
                </Typography>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-white hover:bg-white/20 ml-4">
                <X className="h-6 w-6" />
              </Button>
            </div>

            <div className="p-8 space-y-8">
              {/* Legend */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-600">
                <Typography variant="h3" size="lg" weight="bold" className="mb-4 text-gray-900 dark:text-white">
                  Score Ranges Guide
                </Typography>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-green-200 dark:border-green-700">
                    <div className="w-5 h-5 rounded-full bg-green-500 shadow-lg" />
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white">Normal</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">0 - Normal Max</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-yellow-200 dark:border-yellow-700">
                    <div className="w-5 h-5 rounded-full bg-yellow-500 shadow-lg" />
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white">Warning</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Warning Min - Max</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-red-200 dark:border-red-700">
                    <div className="w-5 h-5 rounded-full bg-red-500 shadow-lg" />
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white">Banned</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Banned Min - 100</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Threshold Settings for Each Day */}
              <div className="space-y-5">
                {thresholds.map((threshold, index) => (
                  <div key={threshold.day} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
                    <Typography variant="h3" size="base" weight="bold" className="mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm">
                        {threshold.day}
                      </span>
                    </Typography>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <label htmlFor={`normal-${index}`} className="text-sm font-bold text-gray-700 dark:text-gray-200 block">
                          🟢 Normal Max
                        </label>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Range: 0 - {threshold.normalMax}</div>
                        <Input
                          id={`normal-${index}`}
                          type="number"
                          min="0"
                          max="100"
                          value={threshold.normalMax}
                          onChange={(e) => handleThresholdChange(index, 'normalMax', e.target.value)}
                          className="text-base font-semibold h-12 border-2"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor={`warning-min-${index}`} className="text-sm font-bold text-gray-700 dark:text-gray-200 block">
                          🟡 Warning Min
                        </label>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Minimum warning score</div>
                        <Input
                          id={`warning-min-${index}`}
                          type="number"
                          min="0"
                          max="100"
                          value={threshold.warningMin}
                          onChange={(e) => handleThresholdChange(index, 'warningMin', e.target.value)}
                          className="text-base font-semibold h-12 border-2"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor={`warning-max-${index}`} className="text-sm font-bold text-gray-700 dark:text-gray-200 block">
                          🟡 Warning Max
                        </label>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Maximum warning score</div>
                        <Input
                          id={`warning-max-${index}`}
                          type="number"
                          min="0"
                          max="100"
                          value={threshold.warningMax}
                          onChange={(e) => handleThresholdChange(index, 'warningMax', e.target.value)}
                          className="text-base font-semibold h-12 border-2"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor={`banned-min-${index}`} className="text-sm font-bold text-gray-700 dark:text-gray-200 block">
                          🔴 Banned Min
                        </label>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Range: {threshold.bannedMin} - 100</div>
                        <Input
                          id={`banned-min-${index}`}
                          type="number"
                          min="0"
                          max="100"
                          value={threshold.bannedMin}
                          onChange={(e) => handleThresholdChange(index, 'bannedMin', e.target.value)}
                          className="text-base font-semibold h-12 border-2"
                        />
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Preview: <span className="text-green-600 dark:text-green-400">Normal (0-{threshold.normalMax})</span> | <span className="text-yellow-600 dark:text-yellow-400">Warning ({threshold.warningMin}-{threshold.warningMax})</span> | <span className="text-red-600 dark:text-red-400">Banned ({threshold.bannedMin}-100)</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-6 border-t-2 border-gray-200 dark:border-gray-700">
                <Button variant="outline" onClick={handleReset} className="h-12 px-6 text-base font-semibold">
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Reset to Defaults
                </Button>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => onOpenChange(false)} className="h-12 px-6 text-base font-semibold">
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving} className="h-12 px-6 text-base font-semibold bg-blue-600 hover:bg-blue-700">
                    <Save className="h-5 w-5 mr-2" />
                    {saving ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
