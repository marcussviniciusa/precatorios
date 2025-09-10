'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MessageSquare, Phone, UserPlus, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Activity {
  id: string
  type: 'message' | 'call' | 'lead' | 'document'
  title: string
  description: string
  timestamp: Date
  leadName?: string
}

interface RecentActivityProps {
  activities?: Activity[]
}

const activityIcons = {
  message: MessageSquare,
  call: Phone,
  lead: UserPlus,
  document: FileText
}

const activityColors = {
  message: 'bg-blue-100 text-blue-800',
  call: 'bg-green-100 text-green-800',
  lead: 'bg-purple-100 text-purple-800',
  document: 'bg-orange-100 text-orange-800'
}

export default function RecentActivity({ activities = [] }: RecentActivityProps) {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Atividades Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-2">Nenhuma atividade</h3>
            <p className="text-sm text-gray-600">
              As atividades recentes aparecerão aqui quando você começar a interagir com leads.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = activityIcons[activity.type]
              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full ${activityColors[activity.type]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(activity.timestamp)}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600">
                      {activity.description}
                    </p>
                    {activity.leadName && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {activity.leadName}
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}