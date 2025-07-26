export const formatCurrency = (amount: number): string => {
  return `৳${amount.toLocaleString()}`;
};

export const formatCurrencyDetailed = (amount: number): string => {
  return `৳${amount.toFixed(2)}`;
};