/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { getTotalExpenses } from '../api/services/receiptService'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})


function RouteComponent() {
  const [totalExpense, setTotalExpense] = useState<number | null>(null);

  useEffect(() => {
    getTotalExpenses().then(setTotalExpense)
  }, [])
  
  return(
    <div className="bg-white h-full">
      {totalExpense}
    </div>
  )
}
