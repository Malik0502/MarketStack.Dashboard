/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { CircleEuro, CircleSlash2, Euro, Hash, Percent, ShoppingCart, TicketPercent } from 'lucide-react';
import { getTotalExpenses, getTotalTaxExpenses, getPercentageChangeLastWeek, getTaxPercentageChangeLastWeek } from '@/api/services/totalExpenseService';
import { SimpleDataCard } from '@/Components/Dashboard/simpleDataCard';
import { getAverageItems, getAveragePurchaseValue, getDiscountShare, getTotalPurchases } from '@/api/services/receiptService';

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


  useEffect(() => {
    getTotalExpenses().then(setTotalExpense);
    getTotalTaxExpenses().then(setTotalTaxExpense);
    getPercentageChangeLastWeek().then(setPercentageChange);
    getTaxPercentageChangeLastWeek().then(setTaxPercentageChange);
    getTotalPurchases().then(setTotalPurchases);
    getAveragePurchaseValue().then(setAveragePurchaseValue);
    getAverageItems().then(setAverageItemsPerOrder);
    getDiscountShare().then(setDiscountItemShare);
  }, [])
  
  return(
    <div className="bg-white h-full grid grid-cols-1 md:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-3 gap-4 m-8">
      
      <SimpleDataCard
        title="Total Purchases"
        value={totalPurchases}
        icon={<ShoppingCart size={28} />}
        hasFooter={false}
        valueIcon={<Hash size={48} />}
      />

      <SimpleDataCard
        title="Total Expenses"
        value={totalExpense}
        change={percentageChange!}
        icon={<CircleEuro size={28} />}
        hasFooter={true}
        footerText={"since last week"}
        valueIcon={<Euro size={48} />}
      />

      <SimpleDataCard
        title="Average Purchase Value"
        value={averagePurchaseValue}
        icon={<CircleSlash2 size={28} />}
        hasFooter={false}
        valueIcon={<Euro size={48} />}
      />

      <SimpleDataCard
        title="Total Tax Expenses"
        value={totalTaxExpense}
        change={taxPercentageChange!}
        icon={<CircleEuro size={28} />}
        hasFooter={true}
        footerText={"since last week"}
        valueIcon={<Euro size={48} />}
      />

      <SimpleDataCard
        title="Discounted Item Share"
        value={discountItemShare}
        icon={<TicketPercent size={28} />}
        hasFooter={false}
        valueIcon={<Percent size={48} />}
      />

      <SimpleDataCard
        title="Average Items per Order"
        value={averageItemsPerOrder}
        icon={<CircleSlash2 size={28} />}
        hasFooter={false}
        valueIcon={<CircleSlash2 size={48} />}
      />
    </div>
  )
}
