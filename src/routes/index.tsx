/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { getTotalPurchases, getAveragePurchaseValue, getAverageItems, getDiscountShare } from '@/api/services/receiptService';
import { getTotalExpenses, getTotalTaxExpenses, getPercentageChangeLastWeek, getTaxPercentageChangeLastWeek } from '@/api/services/totalExpenseService';
import { SimpleDataCard } from '@/Components/Dashboard/Cards/simpleDataCard';
import type { SimpleCardModel } from '@/models/simpleCardModel';
import { ShoppingCart, CircleEuro, Euro, CircleSlash2, TicketPercent, Percent, Hash } from 'lucide-react';
import { useState, useEffect } from 'react';
import {scalePoint} from '@tanstack/charts/scales/point'
import {scaleLinear} from '@tanstack/charts/scales/linear'
import { defineChart, lineY } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/charts/react'
import type { MonthlyExpense } from '@/api/objects/dto/monthlyExpense';
import { getMonthlyExpenses } from '@/api/services/expenseHistoryService';

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  const [totalExpense, setTotalExpense] = useState<number | null>(null);
    const [totalTaxExpense, setTotalTaxExpense] = useState<number | null>(null);
    const [percentageChange, setPercentageChange] = useState<number | null>(null);
    const [taxPercentageChange, setTaxPercentageChange] = useState<number | null>(null);
    const [totalPurchases, setTotalPurchases] = useState<number | null>(null);
    const [averagePurchaseValue, setAveragePurchaseValue] = useState<number | null>(null);
    const [averageItemsPerOrder, setAverageItemsPerOrder] = useState<number | null>(null);
    const [discountItemShare, setDiscountItemShare] = useState<number | null>(null);
    const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpense[]>([]);

    const simpleCards: SimpleCardModel<number | null>[] = [
      {
        title: "Total Purchases",
        value: totalPurchases,
        icon: <ShoppingCart size={28} />,
        hasFooter: false,
        valueIcon: <Hash size={48} />
      },
      {
        title: "Total Expenses",
        value: totalExpense,
        change: percentageChange!,
        icon: <CircleEuro size={28} />,
        hasFooter: true,
        footerText: "since last week",
        valueIcon: <Euro size={48} />
      },
      {
        title: "Average Purchase Value",
        value: averagePurchaseValue,
        icon: <CircleSlash2 size={28} />,
        hasFooter: false,
        valueIcon: <Euro size={48} />
      },
      {
        title: "Total Tax Expenses",
        value: totalTaxExpense,
        change: taxPercentageChange!,
        icon: <CircleEuro size={28} />,
        hasFooter: true,
        footerText: "since last week",
        valueIcon: <Euro size={48} />
      },
      {
        title: "Discounted Item Share",
        value: discountItemShare,
        icon: <TicketPercent size={28} />,
        hasFooter: false,
        valueIcon: <Percent size={48} />
      },
      {
        title: "Average Items per Order",
        value: averageItemsPerOrder,
        icon: <CircleSlash2 size={28} />,
        hasFooter: false,
        valueIcon: <CircleSlash2 size={48} />
      }
    ]

    const maxExpense = monthlyExpenses.length > 0 ? Math.max(...monthlyExpenses.map(x => x.expense)): 500;

const monthlyExpenseChart = defineChart({
  marks: [
    lineY(monthlyExpenses, {
      x: 'purchasedAt',
      y: 'expense',
    }),
  ],
  scales: {
    x: {
      scale: () => scalePoint().padding(0.18),
    },
    y: {
      scale: () => scaleLinear().domain([0, maxExpense]),
      nice: true,
      axis: {
        label: 'Total Expenses',
      },
    },
  },
  tooltip,
});

    useEffect(() => {
        getTotalExpenses().then(setTotalExpense);
        getTotalTaxExpenses().then(setTotalTaxExpense);
        getPercentageChangeLastWeek().then(setPercentageChange);
        getTaxPercentageChangeLastWeek().then(setTaxPercentageChange);
        getTotalPurchases().then(setTotalPurchases);
        getAveragePurchaseValue().then(setAveragePurchaseValue);
        getAverageItems().then(setAverageItemsPerOrder);
        getDiscountShare().then(setDiscountItemShare);
        getMonthlyExpenses().then(setMonthlyExpenses);
    }, [])

    return (
        <div className="bg-white h-full grid grid-cols-1 md:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-3 gap-4 m-8">
            {simpleCards.map((card, index) => (
                <SimpleDataCard
                    key={index}
                    title={card.title}
                    value={card.value}
                    change={card.change}
                    icon={card.icon}
                    hasFooter={card.hasFooter}
                    footerText={card.footerText}
                    valueIcon={card.valueIcon}
                />
            ))}
            <Chart
              definition={monthlyExpenseChart}
              height={400}
              ariaLabel="Monthly Expenses"
              className='col-span-2'/>
        </div>
    )
}
