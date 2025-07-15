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
      return NextResponse.json({ error: 'VTPass API credentials not configured' }, { status: 500 })
    }
    if (!serviceID || !billersCode) {
      return NextResponse.json({ error: 'serviceID and billersCode required' }, { status: 400 })
    }

    const payload = { serviceID, billersCode, ...(type && { type }) }

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
    return res.ok
      ? NextResponse.json({ success: true, data: data.content })
      : NextResponse.json({ error: 'VTpass error', details: data }, { status: res.status })
  } catch (err) {
    console.error('verify error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}