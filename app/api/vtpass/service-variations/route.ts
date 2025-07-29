// import { NextRequest, NextResponse } from 'next/server'

// const VTPASS_BASE_URL = 'https://vtpass.com/api'

// export async function GET(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url)
//     const serviceID = searchParams.get('serviceID')
    
//     // Get API credentials from environment variables (server-side only)
//     const apiKey = process.env.VTPASS_API_KEY
//     const secretKey = process.env.VTPASS_SECRET_KEY
    
//     if (!apiKey || !secretKey) {
//       return NextResponse.json(
//         { error: 'VTPass API credentials not configured' },
//         { status: 500 }
//       )
//     }
    
//     if (!serviceID) {
//       return NextResponse.json(
//         { error: 'ServiceID parameter is required' },
//         { status: 400 }
//       )
//     }
    
//     // Make request to VTPass API
//     const response = await fetch(`${VTPASS_BASE_URL}/service-variations?serviceID=${serviceID}`, {
//       method: 'GET',
//       headers: {
//         'api-key': apiKey,
//         'secret-key': secretKey,
//         'Content-Type': 'application/json',
//       },
//     })
    
//     if (!response.ok) {
//       const errorData = await response.json().catch(() => ({}))
//       return NextResponse.json(
//         { 
//           error: 'Failed to fetch service variations from VTPass',
//           details: errorData,
//           status: response.status
//         },
//         { status: response.status }
//       )
//     }
    
//     const data = await response.json()
    
//     // Sort variations by amount (ascending) for better UX
//     if (data.content && data.content.variations) {
//       data.content.variations.sort((a: any, b: any) => {
//         const amountA = parseFloat(a.variation_amount) || 0
//         const amountB = parseFloat(b.variation_amount) || 0
//         return amountA - amountB
//       })
//     }
    
//     return NextResponse.json(data)
    
//   } catch (error) {
//     console.error('Error fetching VTPass service variations:', error)
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     )
//   }
// }

// // Optional: Add POST method for customer verification
// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json()
//     const { serviceID, billersCode } = body
    
//     // Get API credentials from environment variables
//     const apiKey = process.env.VTPASS_API_KEY
//     const secretKey = process.env.VTPASS_SECRET_KEY
    
//     if (!apiKey || !secretKey) {
//       return NextResponse.json(
//         { error: 'VTPass API credentials not configured' },
//         { status: 500 }
//       )
//     }
    
//     if (!serviceID || !billersCode) {
//       return NextResponse.json(
//         { error: 'ServiceID and billersCode are required' },
//         { status: 400 }
//       )
//     }
    
//     // Make request to VTPass merchant-verify endpoint
//     const response = await fetch(`${VTPASS_BASE_URL}/merchant-verify`, {
//       method: 'POST',
//       headers: {
//         'api-key': apiKey,
//         'secret-key': secretKey,
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         serviceID,
//         billersCode
//       })
//     })
    
//     if (!response.ok) {
//       const errorData = await response.json().catch(() => ({}))
//       return NextResponse.json(
//         { 
//           error: 'Failed to verify customer details',
//           details: errorData,
//           status: response.status
//         },
//         { status: response.status }
//       )
//     }
    
//     const data = await response.json()
//     return NextResponse.json(data)
    
//   } catch (error) {
//     console.error('Error verifying customer:', error)
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     )
//   }
// }