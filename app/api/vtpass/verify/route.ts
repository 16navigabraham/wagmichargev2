// app/api/vtpass/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'

const VTPASS_BASE_URL = 'https://vtpass.com/api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { serviceID, billersCode, type } = body

    const apiKey = process.env.VTPASS_API_KEY
    const secretKey = process.env.VTPASS_SECRET_KEY

    if (!apiKey || !secretKey) {
      return NextResponse.json({ 
        error: 'VTPass API credentials not configured' 
      }, { status: 500 })
    }

    if (!serviceID || !billersCode) {
      return NextResponse.json({ 
        error: 'serviceID and billersCode required' 
      }, { status: 400 })
    }

    const payload = {
      serviceID,
      billersCode,
      ...(type && { type })
    }

    console.log('VTPass verify request:', payload)

    const res = await fetch(`${VTPASS_BASE_URL}/merchant-verify`, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'secret-key': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    console.log('VTPass verify response:', { status: res.status, data })

    if (res.ok) {
      return NextResponse.json({ 
        success: true, 
        data: data.content 
      })
    } else {
      // More detailed error handling
      const errorMessage = data.response_description || 
                          data.message || 
                          data.error || 
                          `VTPass API returned status ${res.status}`
      
      console.error('VTPass verify error:', {
        status: res.status,
        statusText: res.statusText,
        data,
        payload
      })

      return NextResponse.json({ 
        error: errorMessage,
        details: data,
        status: res.status
      }, { status: res.status })
    }
  } catch (err) {
    console.error('verify error', err)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
}