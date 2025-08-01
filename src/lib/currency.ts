export const formatCurrency = (amount: number, currencySymbol: string = '৳'): string => {
  return `${currencySymbol}${amount.toLocaleString()}`;
};

export const formatCurrencyDetailed = (amount: number, currencySymbol: string = '৳'): string => {
  return `${currencySymbol}${amount.toFixed(2)}`;
};