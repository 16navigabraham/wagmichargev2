import { NextRequest, NextResponse } from 'next/server'

const VTPASS_BASE_URL = 'https://vtpass.com/api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const identifier = searchParams.get('identifier')
    
    // Get API credentials from environment variables (server-side only)
    const apiKey = process.env.VTPASS_API_KEY
    const secretKey = process.env.VTPASS_SECRET_KEY
    
    if (!apiKey || !secretKey) {
      return NextResponse.json(
        { error: 'VTPass API credentials not configured' },
        { status: 500 }
      )
    }
    
    if (!identifier) {
      return NextResponse.json(
        { error: 'Identifier parameter is required' },
        { status: 400 }
      )
    }
    
    // Make request to VTPass API
    const response = await fetch(`${VTPASS_BASE_URL}/services?identifier=${identifier}`, {
      method: 'GET',
      headers: {
        'api-key': apiKey,
        'secret-key': secretKey,
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { 
          error: 'Failed to fetch services from VTPass',
          details: errorData,
          status: response.status
        },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    
    // Filter and format the response based on identifier
    let filteredContent = data.content || []
    
    if (identifier === 'internet') {
      // Filter for internet/data services
      filteredContent = filteredContent.filter((service: any) => 
        service.name.toLowerCase().includes('data') || 
        service.name.toLowerCase().includes('internet') ||
        service.serviceID.toLowerCase().includes('data')
      )
    } else if (identifier === 'electricity') {
      // Filter for electricity services
      filteredContent = filteredContent.filter((service: any) => 
        service.name.toLowerCase().includes('electric') || 
        service.name.toLowerCase().includes('power') ||
        service.serviceID.toLowerCase().includes('electric')
      )
    } else if (identifier === 'tv-subscription') {
      // Filter for TV subscription services
      filteredContent = filteredContent.filter((service: any) => 
        service.name.toLowerCase().includes('dstv') || 
        service.name.toLowerCase().includes('gotv') ||
        service.name.toLowerCase().includes('startimes') ||
        service.name.toLowerCase().includes('showmax') ||
        service.serviceID.toLowerCase().includes('tv')
      )
    }
    
    return NextResponse.json({
      ...data,
      content: filteredContent
    })
    
  } catch (error) {
    console.error('Error fetching VTPass services:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}