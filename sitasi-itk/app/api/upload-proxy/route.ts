import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const gasEndpoint = process.env.NEXT_PUBLIC_GAS_ENDPOINT;
    
    if (!gasEndpoint) {
      return NextResponse.json(
        { success: false, error: "GAS endpoint tidak dikonfigurasi" },
        { status: 500 }
      );
    }
    
    console.log("Meneruskan permintaan ke GAS:", gasEndpoint);
    
    // Forward the request to GAS
    const response = await fetch(gasEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      console.error("Respon error dari GAS:", response.status, response.statusText);
      return NextResponse.json(
        { success: false, error: `Error dari GAS: ${response.status} ${response.statusText}` },
        { status: 500 }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}