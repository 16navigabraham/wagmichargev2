import { NextRequest, NextResponse } from 'next/server'

const VTPASS_BASE_URL = 'https://vtpass.com/api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { serviceID, billersCode, type } = body
    
    // Get API credentials from environment variables
    const apiKey = process.env.VTPASS_API_KEY
    const secretKey = process.env.VTPASS_SECRET_KEY
    
    if (!apiKey || !secretKey) {
      return NextResponse.json(
        { error: 'VTPass API credentials not configured' },
        { status: 500 }
      )
    }
    
    if (!serviceID || !billersCode) {
      return NextResponse.json(
        { error: 'ServiceID and billersCode are required' },
        { status: 400 }
      )
    }
    
    // Prepare request body based on service type
    let requestBody: any = {
      serviceID,
      billersCode
    }
    
    // Add type for electricity services (prepaid/postpaid)
    if (type) {
      requestBody.type = type
    }
    
    // Make request to VTPass merchant-verify endpoint
    const response = await fetch(`${VTPASS_BASE_URL}/merchant-verify`, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'secret-key': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          error: 'Failed to verify customer details',
          details: data,
          status: response.status
        },
        { status: response.status }
      )
    }
    
    // Return standardized response
    return NextResponse.json({
      success: true,
      data: {
        customerName: data.content?.Customer_Name || data.content?.customer_name || 'Unknown',
        customerInfo: data.content,
        status: data.response_description || 'Verification successful'
      }
    })
    
  } catch (error) {
    console.error('Error verifying customer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}