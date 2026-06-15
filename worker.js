const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // ==========================================
    // ENDPOINT: CREATE ORDER FOR CHECKOUT
    // ==========================================
    if (url.pathname === "/create-order" && request.method === "POST") {
      try {
        const body = await request.json();
        const { customerId, customerName, customerPhone, amount } = body;

        // Cashfree Order Payload
        const cfPayload = {
          order_amount: parseFloat(amount),
          order_currency: "INR",
          order_id: `ORDER_${customerId}_${Date.now()}`,
          customer_details: {
            customer_id: customerId,
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_email: "support@luckytelecom.in" 
          },
          order_meta: {
            // Payment hone ke baad kahan wapas aana hai (Aap apni site ka URL daal sakte hain)
            return_url: "https://your-frontend-url.pages.dev/?order_id={order_id}"
          }
        };

        // ⚠️ LIVE PRODUCTION ORDERS API URL ⚠️
        const response = await fetch("https://api.cashfree.com/pg/orders", {
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

        if (!response.ok) {
           return new Response(JSON.stringify({ error: data.message || "Order creation failed", details: data }), { 
              status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } 
          });
        }

        // Success: Sending Payment Session ID to frontend
        return new Response(JSON.stringify({ payment_session_id: data.payment_session_id, order_id: data.order_id }), { 
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  }
};
