import type { ReactNode } from "react";
import type { SimpleCardModel } from "@/models/simpleCardModel";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/Components/ui/card";

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
  return (
    <Card className="w-full h-3/4 flex flex-col">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-xl">
          {title}
        </CardTitle>

        {icon}
      </CardHeader>

      <CardContent className="flex flex-1 items-center gap-2 w-full">
        {valueIcon}

        <span className="text-5xl">
          {formatValue(value)}
        </span>
      </CardContent>

      <CardFooter className={`gap-2 ${!hasFooter ? "invisible" : ""}`}>
        <span className="text-red-600">
          +{change}%
        </span>

        <span>
          {footerText}
        </span>
      </CardFooter>
    </Card>
  );
}