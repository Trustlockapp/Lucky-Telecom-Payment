const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight requests handle karne ke liye
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // ==========================================
    // ENDPOINT: GENERATE PAYMENT LINK
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
          link_notify: { send_sms: true }, // SMS automatic jayega
          link_id: `DUES_${customerId}_${Date.now()}`,
          link_amount: parseFloat(amount),
          link_currency: "INR",
          link_purpose: "Pending Dues Clearance",
        };

        // ⚠️ LIVE PRODUCTION URL ⚠️
        const response = await fetch("https://api.cashfree.com/pg/links", {
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

        // Agar Cashfree se error aata hai toh exact reason wapas bhejega
        if (!response.ok) {
           return new Response(JSON.stringify({ error: data.message || "Cashfree API Error", details: data }), { 
              status: response.status, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
          });
        }

        // Success response
        return new Response(JSON.stringify(data), { 
            status: 200, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  }
};
