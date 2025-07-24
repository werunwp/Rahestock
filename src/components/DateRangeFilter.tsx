import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";

interface DateRangeFilterProps {
  onDateRangeChange: (startDate?: Date, endDate?: Date) => void;
}

export function DateRangeFilter({ onDateRangeChange }: DateRangeFilterProps) {
  const [date, setDate] = useState<DateRange | undefined>();
  const [selectedPreset, setSelectedPreset] = useState<string>("all");

  const presets = [
    { label: "All Time", value: "all", days: null },
    { label: "Today", value: "today", days: 0 },
    { label: "Last 7 days", value: "7days", days: 7 },
    { label: "Last 30 days", value: "30days", days: 30 },
  ];

  const handlePresetClick = (preset: typeof presets[0]) => {
    setSelectedPreset(preset.value);
    
    if (preset.value === "all") {
      setDate(undefined);
      onDateRangeChange();
    } else if (preset.value === "today") {
      const today = new Date();
      setDate({ from: today, to: today });
      onDateRangeChange(startOfDay(today), endOfDay(today));
    } else if (preset.days) {
      const endDate = new Date();
      const startDate = subDays(endDate, preset.days - 1);
      setDate({ from: startDate, to: endDate });
      onDateRangeChange(startOfDay(startDate), endOfDay(endDate));
    }
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    setDate(range);
    setSelectedPreset("custom");
    
    if (range?.from && range?.to) {
      onDateRangeChange(startOfDay(range.from), endOfDay(range.to));
    } else if (range?.from) {
      onDateRangeChange(startOfDay(range.from), endOfDay(range.from));
    } else {
      onDateRangeChange();
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.value}
                variant={selectedPreset === preset.value ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetClick(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Custom date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={handleDateSelect}
                numberOfMonths={2}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardContent>
    </Card>
  );
}