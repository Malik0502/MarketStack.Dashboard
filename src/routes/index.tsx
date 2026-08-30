/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { CircleEuro, Euro } from 'lucide-react';
import { getTotalExpenses, getTotalTaxExpenses, getPercentageChangeLastWeek, getTaxPercentageChangeLastWeek } from '@/api/services/totalExpenseService';
import { TotalExpenseCard } from '@/Components/Dashboard/totalExpenseCard';

export const Route = createFileRoute('/')({
  component: RouteComponent,
})


function RouteComponent() {
  const [totalExpense, setTotalExpense] = useState<number | null>(null);
  const [totalTaxExpense, setTotalTaxExpense] = useState<number | null>(null);
  const [percentageChange, setPercentageChange] = useState<number | null>(null);
  const [taxPercentageChange, setTaxPercentageChange] = useState<number | null>(null);


  useEffect(() => {
    getTotalExpenses().then(setTotalExpense);
    getTotalTaxExpenses().then(setTotalTaxExpense);
    getPercentageChangeLastWeek().then(setPercentageChange);
    getTaxPercentageChangeLastWeek().then(setTaxPercentageChange);
  }, [])
  
  return(
    <div className="bg-white h-full grid grid-cols-4 grid-rows-3 gap-4 m-8">
      <TotalExpenseCard
        title="Total Expenses"
        value={totalExpense}
        change={percentageChange}
        icon={<CircleEuro size={28} />}
        valueIcon={<Euro size={48} />}
      />

      <TotalExpenseCard
        title="Total Tax Expenses"
        value={totalTaxExpense}
        change={taxPercentageChange}
        icon={<CircleEuro size={28} />}
        valueIcon={<Euro size={48} />}
/>
    </div>
  )
}
