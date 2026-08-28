/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { getTotalExpenses } from '../api/services/receiptService'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { CircleDollarSign, DollarSign } from 'lucide-react';
import { Label } from '@/Components/ui/label';

export const Route = createFileRoute('/')({
  component: RouteComponent,
})


function RouteComponent() {
  const [totalExpense, setTotalExpense] = useState<number | null>(null);

  useEffect(() => {
    getTotalExpenses().then(setTotalExpense)
  }, [])
  
  return(
    <div className="bg-white h-full grid grid-cols-4 grid-rows-3 gap-4 m-8">
      <Card className='w-full h-full'>
        <CardHeader className='flex items-center justify-between'>
          <CardTitle className='text-xl'>
              Total-Expenses
            </CardTitle>
          <CircleDollarSign height={28} width={28} />
        </CardHeader>
        <CardContent className='flex align-center items-center gap-2 w-full h-full'>
          <DollarSign height={48} width={48}></DollarSign>
          <Label className='text-4xl'>{totalExpense}</Label>
        </CardContent>
      </Card>
    </div>
  )
}
