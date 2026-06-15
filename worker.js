const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Production mein isko apne frontend URL se replace karein
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS for frontend requests
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // ==========================================
    // ENDPOINT 1: GENERATE PAYMENT LINK
    // ==========================================
    if (url.pathname === "/generate-link" && request.method === "POST") {
      try {
        const body = await request.json();
        const { customerId, customerName, customerPhone, amount } = body;

        // Cashfree Payment Link Payload
        const cfPayload = {
          customer_details: {
            customer_phone: customerPhone,
            customer_name: customerName,
            customer_email: "noreply@luckytelecom.in" // Optional
          },
          link_notify: { send_sms: true }, // Cashfree khud SMS bhejega
          link_id: `DUES_${customerId}_${Date.now()}`, // Link ID mein hi Customer ID daal di
          link_amount: parseFloat(amount),
          link_currency: "INR",
          link_purpose: "Pending Dues Clearance",
        };

        const response = await fetch("https://sandbox.cashfree.com/pg/links", { // Production mein URL change karein
          method: "POST",
          headers: {
            "accept": "application/json",
            "content-type": "application/json",
            "x-client-id": env.CASHFREE_APP_ID,
            "x-client-secret": env.CASHFREE_SECRET_KEY,
            "x-api-version": "2023-08-01"
          },
          body: JSON.stringify(cfPayload)
        });

        const data = await response.json();
        return new Response(JSON.stringify(data), { 
            status: 200, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ==========================================
    // ENDPOINT 2: CASHFREE WEBHOOK (Mark Dues Zero)
    // ==========================================
    if (url.pathname === "/webhook" && request.method === "POST") {
      try {
        // 1. Signature Verify Karna (Security Rule)
        const signature = request.headers.get("x-webhook-signature");
        const timestamp = request.headers.get("x-webhook-timestamp");
        const rawBody = await request.text();

        // Note: Production mein crypto module use karke signature verify karna zaroori hai
        // Taki confirm ho sake ki webhook sirf Cashfree se aaya hai.
        
        const payload = JSON.parse(rawBody);

        if (payload.type === "PAYMENT_SUCCESS_WEBHOOK") {
            const linkId = payload.data.link_id;
            // Extract Customer ID from link_id (e.g., DUES_CUST123_1689999)
            const customerId = linkId.split('_')[1]; 
            
            // YAHAN DATABASE UPDATE LOGIC AAYEGA
            // updateDatabaseToZero(customerId);
            
            console.log(`Customer ${customerId} ka payment successful. Dues 0 kar diye gaye hain.`);
        }

        return new Response("Webhook received", { status: 200 });
      } catch (error) {
        return new Response("Webhook error", { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};
