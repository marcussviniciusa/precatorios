import { NextApiRequest, NextApiResponse } from 'next'
import { initializeSocketServer } from '@/lib/websocket'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Initialize the Socket.IO server
    initializeSocketServer(res)
    
    res.status(200).json({ message: 'Socket.IO server initialized' })
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).json({ message: 'Method not allowed' })
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}