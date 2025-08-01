import { format } from "date-fns";

export const getTimeBasedGreeting = (): string => {
  const hour = new Date().getHours();
  
  if (hour < 12) {
    return "Good Morning";
  } else if (hour < 17) {
    return "Good Afternoon";
  } else if (hour < 21) {
    return "Good Evening";
  } else {
    return "Good Night";
  }
};

export const formatDate = (date: Date, dateFormat: string = 'dd/MM/yyyy'): string => {
  try {
    return format(date, dateFormat);
  } catch (error) {
    return format(date, 'dd/MM/yyyy'); // fallback format
  }
};

export const formatTime = (date: Date, timeFormat: string = '12h'): string => {
  if (timeFormat === '24h') {
    return format(date, 'HH:mm');
  } else {
    return format(date, 'hh:mm a');
  }
};