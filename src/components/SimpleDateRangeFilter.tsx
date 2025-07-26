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
import { Separator } from "@/components/ui/separator";

interface SimpleDateRangeFilterProps {
  onDateRangeChange: (startDate?: Date, endDate?: Date) => void;
}

export function SimpleDateRangeFilter({ onDateRangeChange }: SimpleDateRangeFilterProps) {
  const [date, setDate] = useState<DateRange | undefined>();
  const [tempDate, setTempDate] = useState<DateRange | undefined>();
  const [selectedPreset, setSelectedPreset] = useState<string>("all");
  const [isOpen, setIsOpen] = useState(false);

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
      setTempDate(undefined);
      onDateRangeChange();
      setIsOpen(false);
    } else if (preset.value === "today") {
      const today = new Date();
      const newRange = { from: today, to: today };
      setDate(newRange);
      setTempDate(newRange);
      onDateRangeChange(startOfDay(today), endOfDay(today));
      setIsOpen(false);
    } else if (preset.days) {
      const endDate = new Date();
      const startDate = subDays(endDate, preset.days - 1);
      const newRange = { from: startDate, to: endDate };
      setDate(newRange);
      setTempDate(newRange);
      onDateRangeChange(startOfDay(startDate), endOfDay(endDate));
      setIsOpen(false);
    }
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    setTempDate(range);
    setSelectedPreset("custom");
  };

  const handleApply = () => {
    setDate(tempDate);
    
    if (tempDate?.from && tempDate?.to) {
      onDateRangeChange(startOfDay(tempDate.from), endOfDay(tempDate.to));
    } else if (tempDate?.from) {
      onDateRangeChange(startOfDay(tempDate.from), endOfDay(tempDate.from));
    } else {
      onDateRangeChange();
    }
    
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempDate(date);
    setIsOpen(false);
  };

  const getDisplayText = () => {
    if (selectedPreset === "all") return "All Time";
    if (selectedPreset === "today") return "Today";
    if (selectedPreset === "7days") return "Last 7 days";
    if (selectedPreset === "30days") return "Last 30 days";
    
    if (date?.from) {
      if (date.to) {
        return `${format(date.from, "MMM dd")} - ${format(date.to, "MMM dd, yyyy")}`;
      }
      return format(date.from, "MMM dd, yyyy");
    }
    
    return "All Time";
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full md:w-auto justify-start text-left font-normal",
            "min-w-[200px]"
          )}
          onClick={() => setIsOpen(true)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {getDisplayText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 space-y-4">
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
          
          <Separator />
          
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={tempDate?.from || date?.from}
            selected={tempDate}
            onSelect={handleDateSelect}
            numberOfMonths={2}
            className="p-3 pointer-events-auto"
          />
          
          <Separator />
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={!tempDate?.from}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}