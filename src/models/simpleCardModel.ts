import type { ReactNode } from "react";

export interface SimpleCardModel<T> {
  title: string;
  value: T;
  change?: number;
  icon?: ReactNode;
  valueIcon?: ReactNode;
  hasFooter: boolean;
  footerText?: string | null;

  formatValue?: (value: T) => ReactNode;
}