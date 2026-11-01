import type { ReactNode } from "react";
import type { SimpleCardModel } from "@/models/simpleCardModel";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/Components/ui/card";
import { useFormat } from '@/i18n/format';
import { useTranslation } from 'react-i18next';

export function SimpleDataCard<T>({
  title,
  value,
  change,
  icon,
  valueIcon,
  hasFooter,
  footerText,
  formatValue = (value) => value as ReactNode,
}: SimpleCardModel<T>) {
  const { percent } = useFormat();
  const { t } = useTranslation();
  return (
    <Card className="dashboard-card w-full flex flex-col">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-xl">
          {title}
        </CardTitle>

        {icon}
      </CardHeader>

      <CardContent className="flex flex-1 items-center gap-2 w-full">
        {valueIcon}

        <span className="text-5xl">
          {formatValue(value) ?? t('unavailableValue')}
        </span>
      </CardContent>

      <CardFooter className={`gap-2 ${!hasFooter ? "invisible" : ""}`}>
        {change != null && <span className={change > 0 ? 'trend-up' : change < 0 ? 'trend-down' : 'text-muted-foreground'}>
          {change > 0 ? '+' : ''}{percent(change)}
        </span>}

        <span>
          {footerText}
        </span>
      </CardFooter>
    </Card>
  );
}
