import type { ReactNode } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "../ui/card";

type TotalExpenseCardProps<T> = {
  title: string;
  value: T;
  change: number | null;
  icon?: ReactNode;
  valueIcon?: ReactNode;
  footerText?: string;

  formatValue?: (value: T) => ReactNode;
  formatChange?: (change: number | null) => ReactNode;
};

export function TotalExpenseCard<T>({
  title,
  value,
  change,
  icon,
  valueIcon,
  footerText = "since Last Week",
  formatValue = (value) => value as ReactNode,
  formatChange = (change) => `${change}%`,
}: TotalExpenseCardProps<T>) {
  return (
    <Card className="w-full h-3/4">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-xl">
          {title}
        </CardTitle>

        {icon}
      </CardHeader>

      <CardContent className="flex align-center items-center gap-2 w-full h-full">
        {valueIcon}

        <span className="text-5xl">
          {formatValue(value)}
        </span>
      </CardContent>

      <CardFooter className="gap-2">
        <span className="text-red-600">
          +{formatChange(change)}
        </span>

        <span>
          {footerText}
        </span>
      </CardFooter>
    </Card>
  );
}