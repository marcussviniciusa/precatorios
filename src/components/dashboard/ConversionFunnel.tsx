'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface ConversionFunnelProps {
  data: Array<{
    stage: string
    count: number
  }>
}

export default function ConversionFunnel({ data }: ConversionFunnelProps) {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Funil de Conversão</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis 
              dataKey="stage" 
              type="category" 
              tick={{ fontSize: 12 }}
              width={80}
            />
            <Tooltip formatter={(value) => [value, 'Leads']} />
            <Bar 
              dataKey="count" 
              fill="hsl(var(--primary))"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}