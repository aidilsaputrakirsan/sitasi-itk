// app/api/upload-proxy/route.ts - with enhanced error handling
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const gasEndpoint = process.env.NEXT_PUBLIC_GAS_ENDPOINT;
    
    if (!gasEndpoint) {
      console.error("GAS endpoint tidak dikonfigurasi");
      return NextResponse.json(
        { success: false, error: "GAS endpoint tidak dikonfigurasi" },
        { status: 500 }
      );
    }
    
    console.log("Meneruskan permintaan ke GAS:", gasEndpoint);
    console.log("Request body size:", JSON.stringify(body).length);
    
    // Forward the request to GAS
    let response;
    try {
      response = await fetch(gasEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      return NextResponse.json(
        { success: false, error: `Network error: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}` },
        { status: 500 }
      );
    }
    
    if (!response.ok) {
      console.error("Respon error dari GAS:", response.status, response.statusText);
      let errorText;
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = "Could not read response text";
      }
      
      return NextResponse.json(
        { success: false, error: `Error dari GAS: ${response.status} ${response.statusText}. Body: ${errorText}` },
        { status: 500 }
      );
    }
    
    // Parse the JSON response
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error("JSON parse error:", jsonError, "Response:", await response.text());
      return NextResponse.json(
        { success: false, error: "Invalid JSON response from GAS API" },
        { status: 500 }
      );
    }
    
    console.log("GAS response:", {
      success: data.success,
      fileId: data.fileId,
      fileName: data.fileName
    });
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}